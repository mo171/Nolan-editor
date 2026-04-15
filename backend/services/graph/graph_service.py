"""
Neo4j Graph Service
=====================
Pushes scenes, characters, and their relationships into Neo4j.
Enables complex storytelling consistency checks.
"""

import os
import logging
from typing import Dict, Any

from lib.neo4j_client import get_neo4j_driver
from services.nlp.entity_extractor import ExtractionResult

logger = logging.getLogger("nolan.graph.graph_service")


async def update_graph(project_id: str, scene_id: str, nlp_result: ExtractionResult, dominant_emotion: str = None, scene_title: str = None):
    """
    Called by scene_processor.py after NLP extraction.
    Creates or updates Scene, Character nodes and their relationships.
    Tracks Social Graph (co-occurrence) and Action Graph (SVO).
    Uses proper session management with retry logic for connection failures.
    """
    driver = get_neo4j_driver()
    if not driver:
        logger.warning("[Graph] Neo4j not connected. Skipping graph update.")
        return

    # 1. Base Scene and Character Appearance
    cypher_base = """
    MERGE (s:Scene {id: $scene_id})
    SET s.project_id = $project_id,
        s.emotion = $emotion,
        s.title = $title

    WITH s
    UNWIND $characters AS char_name
    MERGE (c:Character {name: char_name, project_id: $project_id})
    MERGE (c)-[rel:APPEARS_IN]->(s)
    SET rel.emotion = $emotion
    """

    # 2. Social Graph: Character co-occurrence (Mutual Interaction)
    cypher_social = """
    MATCH (s:Scene {id: $scene_id})
    UNWIND $characters AS char1
    UNWIND $characters AS char2
    WITH s, char1, char2
    WHERE char1 < char2  // Unique pairs only
    MATCH (c1:Character {name: char1, project_id: $project_id})
    MATCH (c2:Character {name: char2, project_id: $project_id})
    MERGE (c1)-[rel:INTERACTS_WITH]-(c2)
    ON MATCH SET rel.weight = coalesce(rel.weight, 0) + 1
    ON CREATE SET rel.weight = 1
    SET rel.last_emotion = $emotion, 
        rel.last_scene_id = $scene_id
    """

    # 3. Action Graph: Character-to-Character SVO Actions
    cypher_action = """
    UNWIND $actions AS action_data
    MATCH (c1:Character {name: action_data.subject, project_id: $project_id})
    MATCH (c2:Character {name: action_data.obj, project_id: $project_id})
    MERGE (c1)-[rel:DID_ACTION {action: action_data.verb, scene_id: $scene_id}]->(c2)
    SET rel.sentence = action_data.sentence,
        rel.emotion = $emotion
    """

    cypher_locs = """
    MATCH (s:Scene {id: $scene_id})
    UNWIND $locations AS loc_name
    MERGE (l:Location {name: loc_name, project_id: $project_id})
    MERGE (s)-[:TAKES_PLACE_AT]->(l)
    """

    try:
        # Prepare actions: only those where both subject and object are in the character list
        char_set = {c.lower() for c in nlp_result.scene_characters}
        actions = []
        for svo in nlp_result.svo_triples:
            if svo.subject and svo.obj and svo.subject.lower() in char_set and svo.obj.lower() in char_set:
                # Map back to original casing
                sub_name = next((c for c in nlp_result.scene_characters if c.lower() == svo.subject.lower()), svo.subject)
                obj_name = next((c for c in nlp_result.scene_characters if c.lower() == svo.obj.lower()), svo.obj)
                
                actions.append({
                    "subject": sub_name,
                    "verb": svo.verb,
                    "obj": obj_name,
                    "sentence": svo.sentence
                })

        # Use context manager for proper session lifecycle
        with driver.session() as session:
            # Run Base
            session.run(
                cypher_base, 
                scene_id=scene_id, 
                project_id=project_id, 
                characters=nlp_result.scene_characters,
                emotion=dominant_emotion or "neutral",
                title=scene_title or f"Scene {scene_id[:8]}"
            )

            # Run Social if > 1 character
            if len(nlp_result.scene_characters) > 1:
                session.run(
                    cypher_social,
                    scene_id=scene_id,
                    project_id=project_id,
                    characters=nlp_result.scene_characters,
                    emotion=dominant_emotion or "neutral"
                )

            # Run Actions if any
            if actions:
                session.run(
                    cypher_action,
                    project_id=project_id,
                    scene_id=scene_id,
                    actions=actions,
                    emotion=dominant_emotion or "neutral"
                )
            
            # Run Locations
            if nlp_result.scene_locations:
                session.run(
                    cypher_locs, 
                    scene_id=scene_id, 
                    project_id=project_id, 
                    locations=nlp_result.scene_locations
                )

        logger.info(f"[Graph] Updated graph for scene={scene_id} with {len(nlp_result.scene_characters)} chars")

    except Exception as e:
        logger.error(f"[Graph] Neo4j update failed for scene {scene_id}: {e}")
        # On connection failure, invalidate the driver so it reconnects next time
        if "defunct" in str(e).lower() or "failed to read" in str(e).lower():
            logger.warning("[Graph] Detected defunct connection, will reconnect on next call")
            global _driver
            from lib.neo4j_client import close_neo4j_driver
            close_neo4j_driver()


async def get_character_timeline(project_id: str, character_name: str) -> list:
    """
    Fetch the chronological timeline of a character from Neo4j.
    Uses proper session management with error recovery.
    """
    driver = get_neo4j_driver()
    if not driver:
        return []

    cypher = """
    MATCH (c:Character {name: $name, project_id: $project_id})-[:APPEARS_IN]->(s:Scene)
    RETURN s.id AS scene_id
    """
    
    try:
        with driver.session() as session:
            result = session.run(cypher, name=character_name, project_id=project_id)
            return [record["scene_id"] for record in result]
    except Exception as e:
        logger.error(f"[Graph] Neo4j timeline failed: {e}")
        # On connection failure, invalidate the driver
        if "defunct" in str(e).lower() or "failed to read" in str(e).lower():
            logger.warning("[Graph] Detected defunct connection, will reconnect on next call")
            from lib.neo4j_client import close_neo4j_driver
            close_neo4j_driver()
        return []

async def get_linter_context(project_id: str, character_names: list[str]) -> str:
    """
    Fetch Character Bible and Social context from Neo4j for the linter prompt.
    Returns a formatted string describing the characters and their known states.
    """
    if not character_names:
        return ""

    driver = get_neo4j_driver()
    if not driver:
        return ""

    # Cypher: Fetch character details + recent social interactions
    cypher = """
    MATCH (c:Character {project_id: $project_id})
    WHERE c.name IN $names
    OPTIONAL MATCH (c)-[r:INTERACTS_WITH]-(other:Character)
    WHERE other.name IN $names
    RETURN c.name AS name, 
           c.role AS role, 
           c.description AS description, 
           c.traits AS traits,
           collect({other: other.name, emotion: r.last_emotion, weight: r.weight}) AS interactions
    """
    
    try:
        with driver.session() as session:
            result = session.run(cypher, project_id=project_id, names=character_names)
            
            context_blocks = []
            for record in result:
                name = record["name"]
                traits = ", ".join(record["traits"] or [])
                role = record["role"] or "Unknown"
                desc = record["description"] or "No description"
                
                block = f"- Character: {name} (Role: {role})\n  Traits: {traits}\n  Description: {desc}"
                
                # Add interactions if relevant
                interactions = [i for i in record["interactions"] if i["other"]]
                if interactions:
                    int_str = ", ".join([f"Feeling {i['emotion']} with {i['other']}" for i in interactions])
                    block += f"\n  Recent Interactions: {int_str}"
                
                context_blocks.append(block)
            
            if not context_blocks:
                return ""

            return "## PROJECT KNOWLEDGE GRAPH (Source of Truth)\n" + "\n".join(context_blocks)

    except Exception as e:
        logger.error(f"[Graph] Context fetch failed: {e}")
        return ""


async def get_visual_graph(project_id: str) -> Dict[str, Any]:
    """
    Fetch all nodes and summarized relationships from Neo4j for the visual visualizer.
    Summarizes multiple interactions into single weighted edges.
    Enriches Neo4j data with Supabase 'Source of Truth' metadata (images, traits).
    """
    from lib.supabase import supabase
    driver = get_neo4j_driver()
    if not driver:
        return {"nodes": [], "edges": []}

    cypher_nodes = """
    MATCH (n {project_id: $project_id})
    RETURN labels(n) AS labels, n AS data, id(n) AS neo_id
    """

    # Summarized Edges: Group by source, target, and type. 
    # Take latest action/emotion and sum weights.
    cypher_edges = """
    MATCH (n {project_id: $project_id})-[r]->(m {project_id: $project_id})
    RETURN id(n) AS source_neo, 
           id(m) AS target_neo, 
           type(r) AS type,
           count(r) AS interaction_count,
           collect(r.action)[-1] AS last_action,
           collect(r.emotion)[-1] AS last_emotion,
           sum(coalesce(r.weight, 1)) AS total_weight
    """

    try:
        with driver.session() as session:
            # 1. Fetch Nodes
            node_result = session.run(cypher_nodes, project_id=project_id)
            nodes = []
            neo_to_id = {} # Map internal neo4j ID to our domain ID

            for record in node_result:
                labels = record["labels"]
                data = dict(record["data"])
                neo_id = record["neo_id"]
                
                node_id = data.get("id") or data.get("name")
                neo_to_id[neo_id] = str(node_id)
                
                nodes.append({
                    "id": str(node_id),
                    "type": labels[0] if labels else "Default",
                    "data": {
                        "label": data.get("title") or data.get("name") or node_id,
                        **data
                    },
                    "position": {"x": 0, "y": 0} 
                })

            # 2. Enrich with Supabase "Source of Truth" (All Characters & Images)
            try:
                # Fetch both project_characters (defined) and characters (extracted)
                pc_res = supabase.table("project_characters").select("name, role, description, traits, image_url").eq("project_id", project_id).execute()
                char_res = supabase.table("characters").select("name, role, description, arc_summary, image_url").eq("project_id", project_id).execute()
                
                # Merge into a master metadata map
                metadata_map = {}
                for c in (pc_res.data or []):
                    metadata_map[c["name"]] = {**c, "is_defined": True}
                for c in (char_res.data or []):
                    # Prefer existing metadata but fill gaps
                    if c["name"] not in metadata_map:
                        metadata_map[c["name"]] = {**c, "is_defined": False}
                    else:
                        metadata_map[c["name"]].update({k: v for k, v in c.items() if v})

                # Ensure ALL characters from Supabase are in the nodes list
                existing_node_ids = {n["id"] for n in nodes if n["type"] == "Character"}
                for name, meta in metadata_map.items():
                    if name not in existing_node_ids:
                        nodes.append({
                            "id": name,
                            "type": "Character",
                            "data": {
                                "label": name,
                                "role": meta.get("role"),
                                "description": meta.get("description"),
                                "traits": meta.get("traits"),
                                "image_url": meta.get("image_url")
                            },
                            "position": {"x": 0, "y": 0}
                        })
                
                # Update existing nodes with Supabase metadata (images, descriptions)
                for node in nodes:
                    if node["type"] == "Character" and node["id"] in metadata_map:
                        node["data"].update(metadata_map[node["id"]])

            except Exception as e:
                logger.warning(f"[Graph] Supabase enrichment failed: {e}")

            # 3. Fetch Summarized Edges
            edge_result = session.run(cypher_edges, project_id=project_id)
            edges = []
            
            for record in edge_result:
                source_neo = record["source_neo"]
                target_neo = record["target_neo"]
                edge_type = record["type"]
                
                source_id = neo_to_id.get(source_neo)
                target_id = neo_to_id.get(target_neo)
                
                if not source_id or not target_id:
                    continue

                edges.append({
                    "id": f"e-{source_id}-{target_id}-{edge_type}",
                    "source": source_id,
                    "target": target_id,
                    "label": edge_type.lower().replace("_", " "),
                    "data": {
                        "type": edge_type,
                        "weight": record["total_weight"],
                        "last_action": record["last_action"],
                        "last_emotion": record["last_emotion"]
                    },
                    "animated": edge_type == "INTERACTS_WITH"
                })

            return {"nodes": nodes, "edges": edges}

    except Exception as e:
        logger.error(f"[Graph] Visual graph fetch failed: {e}")
        return {"nodes": [], "edges": []}


async def init_project_graph(project_id: str, characters: list):
    """
    Called upon project creation to seed the initial cast list into Neo4j.
    Ensures that user-defined characters exist in the graph immediately.
    Uses proper session management with error recovery.
    """
    if not characters:
        return

    driver = get_neo4j_driver()
    if not driver:
        logger.warning("[Graph] Neo4j not connected. Skipping project graph init.")
        return

    cypher = """
    UNWIND $characters AS char
    MERGE (c:Character {name: char.name, project_id: $project_id})
    SET c.role = char.role,
        c.description = char.description,
        c.traits = char.traits,
        c.user_defined = true
    """

    try:
        with driver.session() as session:
            char_list = []
            for c in characters:
                if hasattr(c, "model_dump"):
                    c_dict = c.model_dump()
                elif hasattr(c, "dict"):
                    c_dict = c.dict()
                else:
                    c_dict = c if isinstance(c, dict) else {}

                char_list.append({
                    "name": c_dict.get("name", ""),
                    "role": c_dict.get("role", ""),
                    "description": c_dict.get("description", ""),
                    "traits": c_dict.get("traits", [])
                })
            session.run(cypher, project_id=project_id, characters=char_list)
        logger.info(f"[Graph] Initialized graph for project={project_id} with {len(characters)} characters")
    except Exception as e:
        logger.error(f"[Graph] Neo4j init failed for project {project_id}: {e}")
        # On connection failure, invalidate the driver
        if "defunct" in str(e).lower() or "failed to read" in str(e).lower():
            logger.warning("[Graph] Detected defunct connection, will reconnect on next call")
            from lib.neo4j_client import close_neo4j_driver
            close_neo4j_driver()

