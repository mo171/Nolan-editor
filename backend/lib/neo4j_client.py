"""
Neo4j Driver Singleton
========================
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("nolan.neo4j")

_driver = None

def get_neo4j_driver():
    """Lazily initialize and return the Neo4j driver."""
    global _driver
    if _driver is None:
        try:
            from neo4j import GraphDatabase
            uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            user = os.getenv("NEO4J_USER", "neo4j")
            password = os.getenv("NEO4J_PASSWORD", "password")
            
            _driver = GraphDatabase.driver(uri, auth=(user, password))
            # Just test the connection quickly
            _driver.verify_connectivity()
            logger.info("✅ Neo4j connection established")
        except ImportError:
            logger.error("neo4j package not installed. Run: pip install neo4j")
        except Exception as e:
            logger.error(f"❌ Neo4j connection failed: {e}")
            _driver = None  # don't cache a broken connection
            
    return _driver
