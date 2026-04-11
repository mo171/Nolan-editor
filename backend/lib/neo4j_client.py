"""
Neo4j Driver Singleton
========================
Manages connection pool with proper lifecycle and timeout handling.
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("nolan.neo4j")

_driver = None

def get_neo4j_driver():
    """
    Lazily initialize and return the Neo4j driver with proper connection pooling.
    Configured to handle idle timeouts and connection failures gracefully.
    """
    global _driver
    if _driver is None:
        try:
            from neo4j import GraphDatabase
            uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            
            # Aura networks on some Windows setups encounter SSL verification failure. 
            # neo4j+ssc:// bypasses the local strict verification
            if uri.startswith("neo4j+s://"):
                uri = uri.replace("neo4j+s://", "neo4j+ssc://")
                
            user = os.getenv("NEO4J_USER", "neo4j")
            password = os.getenv("NEO4J_PASSWORD", "password")
            
            # Connection pool configuration to prevent idle timeout issues
            _driver = GraphDatabase.driver(
                uri, 
                auth=(user, password),
                max_connection_lifetime=3600,  # 1 hour max connection age
                max_connection_pool_size=50,   # Max pool size
                connection_acquisition_timeout=60,  # 60s timeout for acquiring connection
                keep_alive=True,  # Enable TCP keepalive
                connection_timeout=30  # 30s connection timeout
            )
            
            # Verify connectivity
            _driver.verify_connectivity()
            logger.info("✅ Neo4j connection pool established")
            
        except ImportError:
            logger.error("neo4j package not installed. Run: pip install neo4j")
            _driver = None
        except Exception as e:
            logger.error(f"❌ Neo4j connection failed: {e}")
            _driver = None  # don't cache a broken connection
            
    return _driver


def close_neo4j_driver():
    """Close the Neo4j driver and cleanup connection pool. Call on app shutdown."""
    global _driver
    if _driver:
        try:
            _driver.close()
            logger.info("Neo4j driver closed")
        except Exception as e:
            logger.error(f"Error closing Neo4j driver: {e}")
        finally:
            _driver = None
