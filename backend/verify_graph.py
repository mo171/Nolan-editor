import asyncio
from lib.neo4j_client import get_neo4j_driver
import logging

logging.basicConfig(level=logging.INFO)

async def verify_nodes():
    print("Verifying stored characters in Neo4j...")
    driver = get_neo4j_driver()
    if not driver:
        print("Failed to get Neo4j driver.")
        return
        
    cypher = """
    MATCH (c:Character)
    RETURN c.name AS name, c.project_id AS project_id
    LIMIT 20
    """
    
    try:
        with driver.session() as session:
            result = session.run(cypher)
            records = list(result)
            if not records:
                print("No characters found in Neo4j yet. Try writing a sentence with a name first!")
            else:
                print(f"Found {len(records)} characters in Neo4j:")
                for r in records:
                    print(f" - {r['name']} (Project ID: {r['project_id']})")
    except Exception as e:
        print(f"Error querying Neo4j: {e}")

if __name__ == "__main__":
    asyncio.run(verify_nodes())
