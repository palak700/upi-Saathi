"""Database engine, session factory and declarative base.

Uses SQLAlchemy 2.0 with ``psycopg`` (PostgreSQL) by default. The URL is
configured via ``UPI_DATABASE_URL``; set it to a ``sqlite:///`` URL for a
zero-config local run without PostgreSQL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    """Base class for all mapped models."""


engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def get_db():
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_models() -> None:
    """Create tables that do not yet exist (idempotent).

    Structured migrations live in ``alembic/``; this is a convenience for
    first-boot and SQLite development mode so the API works before running
    ``alembic upgrade head``.
    """
    if settings.auto_create_tables:
        from . import models  # noqa: F401  (import registers models on Base.metadata)

        Base.metadata.create_all(bind=engine)