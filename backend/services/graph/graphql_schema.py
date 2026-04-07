"""
Strawberry GraphQL Schema for Neo4j
=====================================
Allows frontend visualization libraries (like D3.js or React Flow)
to query the narrative graph flexibly.
"""

import typing
import strawberry
from lib.neo4j_client import get_neo4j_driver

# ─── Types ───────────────────────────────────────────────────────────────────

@strawberry.type
class CharacterNode:
    name: str
    project_id: str
    aliases: typing.Optional[typing.List[str]] = None

@strawberry.type
class SceneNode:
    scene_id: str
    project_id: str

@strawberry.type
class AppearsInEdge:
    source_character: str
    target_scene: str

@strawberry.type
class KnowledgeGraph:
    characters: typing.List[CharacterNode]
    scenes: typing.List[SceneNode]
    edges: typing.List[AppearsInEdge]

# ─── Resolvers ───────────────────────────────────────────────────────────────

def resolve_graph(project_id: str) -> KnowledgeGraph:
    driver = get_neo4j_driver()
    if not driver:
        return KnowledgeGraph(characters=[], scenes=[], edges=[])

    cypher = """
    MATCH (c:Character {project_id: $pid})-[:APPEARS_IN]->(s:Scene)
    RETURN c.name AS char_name, s.id AS scene_id
    """
    
    chars = set()
    scenes = set()
    edges = []
    
    try:
        with driver.session() as session:
            result = session.run(cypher, pid=project_id)
            for record in result:
                chars.add(record["char_name"])
                scenes.add(record["scene_id"])
                edges.append(AppearsInEdge(
                    source_character=record["char_name"],
                    target_scene=record["scene_id"]
                ))
    except Exception as e:
        print(f"GraphQL Error: {e}")

    char_nodes = [CharacterNode(name=name, project_id=project_id) for name in chars]
    scene_nodes = [SceneNode(scene_id=sid, project_id=project_id) for sid in scenes]
    
    return KnowledgeGraph(characters=char_nodes, scenes=scene_nodes, edges=edges)

# ─── Schema Definition ───────────────────────────────────────────────────────

@strawberry.type
class Query:
    @strawberry.field
    def knowledge_graph(self, project_id: str) -> KnowledgeGraph:
        return resolve_graph(project_id)

schema = strawberry.Schema(query=Query)
