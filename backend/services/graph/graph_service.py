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


async def update_graph(project_id: str, scene_id: str, nlp_result: ExtractionResult):
    """
    Called by scene_processor.py after NLP extraction.
    Creates or updates Scene, Character nodes and their relationships.
    """
    driver = get_neo4j_driver()
    if not driver:
        logger.warning("[Graph] Neo4j not connected. Skipping graph update.")
        return

    # A simple single-transaction cypher to ensure nodes exist and link them
    cypher = """
    // 1. Merge the Scene
    MERGE (s:Scene {id: $scene_id})
    SET s.project_id = $project_id

    // 2. Unwind characters and link to Scene
    WITH s
    UNWIND $characters AS char_name
    MERGE (c:Character {name: char_name, project_id: $project_id})
    MERGE (c)-[:APPEARS_IN]->(s)
    """
    
    # We can also add locations if we want
    cypher_locs = """
    UNWIND $locations AS loc_name
    MERGE (l:Location {name: loc_name, project_id: $project_id})
    MERGE (s)-[:TAKES_PLACE_AT]->(l)
    """

    try:
        # We can implement a more complex merge, but keeping it simple for Phase 6 stub
        with driver.session() as session:
            session.run(
                cypher, 
                scene_id=scene_id, 
                project_id=project_id, 
                characters=nlp_result.scene_characters
            )
            
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


async def get_character_timeline(project_id: str, character_name: str) -> list:
    """
    Fetch the chronological timeline of a character from Neo4j.
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
        return []
