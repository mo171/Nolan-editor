"""Rebuild Neo4j narrative connections from Supabase project data.

This utility is intentionally standalone so it can be run after the Neo4j
database has been re-initialized or wiped.

Default behavior:
  1. Fetch all projects from Supabase
  2. Clear any existing Neo4j nodes for each project
  3. Seed user-defined project characters
  4. Replay scene NLP analysis into the graph

If a scene has no stored NLP analysis yet, the script falls back to extracting
entities and SVOs from the saved scene text.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import re
from typing import Any

from lib.neo4j_client import close_neo4j_driver, get_neo4j_driver
from lib.supabase import supabase
from services.graph.graph_service import init_project_graph, update_graph
from services.nlp.entity_extractor import ExtractionResult
from tools.html_stripper import strip_html


logger = logging.getLogger("nolan.rebuild_graph")


def _is_supabase_connection_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "getaddrinfo failed",
            "name or service not known",
            "temporary failure in name resolution",
            "connecterror",
            "connection refused",
        )
    )


def _execute_query(builder, context: str):
    try:
        return builder.execute()
    except Exception as exc:
        if _is_supabase_connection_error(exc):
            raise RuntimeError(
                "Supabase is not reachable from this machine while "
                f"{context}. Check DNS/network access to your SUPABASE_URL, "
                "or verify the URL in backend/.env."
            ) from exc
        raise


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Rebuild Neo4j graph connections from editor project data."
    )
    parser.add_argument(
        "--project-id",
        action="append",
        dest="project_ids",
        help="Limit the rebuild to one or more specific project IDs.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the work that would be done without writing to Neo4j.",
    )
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="Do not clear existing Neo4j nodes for each project before replaying.",
    )
    return parser


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return list(value)


def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip().lower()


def _coerce_extraction_from_analysis(analysis: dict[str, Any]) -> ExtractionResult:
    scene_characters = _as_list(analysis.get("detected_characters"))
    scene_locations = _as_list(analysis.get("detected_locations"))
    return ExtractionResult(
        entities=[],
        svo_triples=[],
        scene_characters=scene_characters,
        scene_locations=scene_locations,
        sentence_count=analysis.get("sentence_count") or 0,
    )


def _extract_scene_fallback(scene: dict[str, Any], project_characters: list[dict[str, Any]]) -> ExtractionResult:
    plain_text = scene.get("plain_text") or strip_html(scene.get("content") or "")
    if not plain_text.strip():
        return ExtractionResult()

    text_lower = plain_text.lower()
    matched_characters: list[str] = []

    for char in sorted(project_characters, key=lambda item: len(item.get("name", "")), reverse=True):
        name = (char.get("name") or "").strip()
        if not name:
            continue

        pattern = rf"(?<!\w){re.escape(name)}(?!\w)"
        if re.search(pattern, plain_text, flags=re.IGNORECASE):
            canonical = name
            if canonical.lower() not in {_normalize_name(existing) for existing in matched_characters}:
                matched_characters.append(canonical)

    if not matched_characters:
        capitalized = []
        for match in re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", plain_text):
            cleaned = match.strip()
            if cleaned and _normalize_name(cleaned) not in {_normalize_name(existing) for existing in capitalized}:
                capitalized.append(cleaned)

        matched_characters = capitalized

    return ExtractionResult(
        entities=[],
        svo_triples=[],
        scene_characters=matched_characters,
        scene_locations=[],
        sentence_count=max(1, len([part for part in re.split(r"[.!?]+", plain_text) if part.strip()])),
    )


def _dedupe_projects(project_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    ordered: list[dict[str, Any]] = []
    for row in project_rows:
        project_id = row.get("id")
        if not project_id or project_id in seen:
            continue
        seen.add(project_id)
        ordered.append(row)
    return ordered


async def clear_project_graph(project_id: str) -> None:
    driver = get_neo4j_driver()
    if not driver:
        raise RuntimeError("Neo4j driver is not available")

    cypher = """
    MATCH (n {project_id: $project_id})
    DETACH DELETE n
    """

    with driver.session() as session:
        session.run(cypher, project_id=project_id)


async def fetch_project_payload(project_id: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    char_res = _execute_query(supabase.table("project_characters").select(
        "id, name, role, description, traits, user_defined"
    ).eq("project_id", project_id).order("created_at"), f"loading characters for project {project_id}")

    chapter_res = _execute_query(supabase.table("chapters").select(
        "id, title, position"
    ).eq("project_id", project_id).order("position"), f"loading chapters for project {project_id}")

    chapter_rows = chapter_res.data or []
    scene_rows: list[dict[str, Any]] = []
    for chapter in chapter_rows:
        scene_res = _execute_query(supabase.table("scenes").select(
            "id, chapter_id, title, content, plain_text, position"
        ).eq("chapter_id", chapter["id"]).order("position"), f"loading scenes for chapter {chapter['id']}")
        scene_rows.extend(scene_res.data or [])

    return char_res.data or [], chapter_rows, scene_rows


async def fetch_scene_analysis(scene_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not scene_ids:
        return {}

    analysis_res = _execute_query(supabase.table("scene_nlp_analysis").select(
        "scene_id, entities, svo_triples, detected_characters, detected_locations, dominant_emotion"
    ).in_("scene_id", scene_ids), "loading scene NLP analysis")

    analysis_map: dict[str, dict[str, Any]] = {}
    for row in analysis_res.data or []:
        scene_id = row.get("scene_id")
        if scene_id:
            analysis_map[scene_id] = row
    return analysis_map


async def rebuild_project(project: dict[str, Any], dry_run: bool = False, keep_existing: bool = False) -> dict[str, int]:
    project_id = project["id"]
    project_title = project.get("title") or project_id

    project_characters, chapters, scenes = await fetch_project_payload(project_id)
    analysis_map = await fetch_scene_analysis([scene["id"] for scene in scenes])

    stats = {
        "project_characters": len(project_characters),
        "chapters": len(chapters),
        "scenes": len(scenes),
        "scenes_replayed": 0,
        "scenes_fallback_extracted": 0,
    }

    logger.info(
        "[Rebuild] Project %s (%s): %s characters, %s chapters, %s scenes",
        project_title,
        project_id,
        stats["project_characters"],
        stats["chapters"],
        stats["scenes"],
    )

    if dry_run:
        logger.info("[Rebuild] Dry run enabled, skipping Neo4j writes for project %s", project_id)
        return stats

    if not keep_existing:
        await clear_project_graph(project_id)

    if project_characters:
        await init_project_graph(project_id, project_characters)

    for scene in scenes:
        scene_id = scene["id"]
        analysis = analysis_map.get(scene_id)

        if analysis:
            extraction = _coerce_extraction_from_analysis(analysis)
            dominant_emotion = analysis.get("dominant_emotion") or "neutral"
        else:
            extraction = _extract_scene_fallback(scene, project_characters)
            dominant_emotion = "neutral"
            stats["scenes_fallback_extracted"] += 1

        if not extraction.scene_characters and not extraction.svo_triples and not extraction.scene_locations:
            continue

        clean_title = scene.get("title") or f"Scene {scene_id[:8]}"
        await update_graph(
            project_id=project_id,
            scene_id=scene_id,
            nlp_result=extraction,
            dominant_emotion=dominant_emotion,
            scene_title=clean_title,
        )
        stats["scenes_replayed"] += 1

    logger.info(
        "[Rebuild] Project %s complete: replayed=%s fallback=%s",
        project_id,
        stats["scenes_replayed"],
        stats["scenes_fallback_extracted"],
    )
    return stats


async def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    try:
        project_query = supabase.table("projects").select("id, title").order("updated_at", desc=True)
        if args.project_ids:
            project_query = project_query.in_("id", args.project_ids)

        projects_res = _execute_query(project_query, "loading projects")
        projects = _dedupe_projects(projects_res.data or [])

        if not projects:
            logger.warning("[Rebuild] No projects found to process")
            return

        driver = get_neo4j_driver()
        if not driver:
            raise RuntimeError(
                "Neo4j driver could not be initialized. Check NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD."
            )

        total_replayed = 0
        total_fallback = 0

        for project in projects:
            stats = await rebuild_project(project, dry_run=args.dry_run, keep_existing=args.keep_existing)
            total_replayed += stats["scenes_replayed"]
            total_fallback += stats["scenes_fallback_extracted"]

        logger.info(
            "[Rebuild] Finished %s project(s): %s scenes replayed, %s fallback extractions",
            len(projects),
            total_replayed,
            total_fallback,
        )
    finally:
        close_neo4j_driver()


if __name__ == "__main__":
    asyncio.run(main())