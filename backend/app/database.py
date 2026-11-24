from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

DEFAULT_SQLITE_URL = "sqlite:///./app.db"


def build_database_url() -> str | URL:
    # An explicit DATABASE_URL always wins (the tests rely on this).
    if settings.database_url != DEFAULT_SQLITE_URL:
        return settings.database_url
    if settings.postgres_host:
        return URL.create(
            "postgresql+psycopg",
            username=settings.postgres_user,
            password=settings.postgres_password,
            host=settings.postgres_host,
            port=settings.postgres_port,
            database=settings.postgres_database_name,
            query={"sslmode": "require"},
        )
    return DEFAULT_SQLITE_URL


database_url = build_database_url()
if str(database_url).startswith("sqlite"):
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False, "timeout": 30},
    )
else:
    # pool_pre_ping replaces connections the host dropped while idle.
    engine = create_engine(database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """All database models inherit from this."""


def get_db():
    """Give each request its own session, and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()