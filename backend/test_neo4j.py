import asyncio
from lib.neo4j_client import get_neo4j_driver
import logging

logging.basicConfig(level=logging.INFO)

async def test_neo4j():
    print("Testing Neo4j connection...")
    driver = get_neo4j_driver()
    if not driver:
        print("Driver could not be initialized. Check your credentials and NEO4J_URI in .env")
        return

    cypher = """
    MERGE (c:Character {name: "Test Character"})
    MERGE (s:Scene {id: "Test Scene"})
    MERGE (c)-[:APPEARS_IN]->(s)
    RETURN c, s
    """
    
    try:
        with driver.session() as session:
            result = session.run(cypher)
            records = list(result)
            print(f"SUCCESS: Successfully executed cypher query. Created/Matched {len(records)} path(s).")
            for record in records:
                print(f"Character: {record['c']['name']}, Scene: {record['s']['id']}")
    except Exception as e:
        print(f"ERROR: Failed to run query: {e}")

if __name__ == "__main__":
    asyncio.run(test_neo4j())
