import os
import asyncpg
from typing import Optional

_pool: Optional[asyncpg.Pool] = None


async def init_db():
    """Initialize the asyncpg connection pool. Call during FastAPI startup."""
    global _pool
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/jobpulse"
    )
    _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)

    # Run migrations on first connect
    async with _pool.acquire() as conn:
        migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
        for migration_file in sorted(
            f for f in os.listdir(migrations_dir) if f.endswith(".sql")
        ):
            path = os.path.join(migrations_dir, migration_file)
            with open(path, "r") as f:
                await conn.execute(f.read())


async def close_db():
    """Close the connection pool. Call during FastAPI shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def get_pool() -> asyncpg.Pool:
    """Get the connection pool for query execution."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db() first.")
    return _pool
