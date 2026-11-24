import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.config import settings
from app.database import Base, engine
from app.routers import auth, images
from app.services import predictor

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)



def _upgrade_existing_database() -> None:
    """Add the verification columns to an older database; existing accounts count as verified."""
    from sqlalchemy import inspect, text

    existing = {c["name"] for c in inspect(engine).get_columns("clinicians")}
    if "email_verified" in existing:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE clinicians ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 1"))
        connection.execute(text("ALTER TABLE clinicians ADD COLUMN verification_code_hash VARCHAR(255)"))
        connection.execute(text("ALTER TABLE clinicians ADD COLUMN verification_expires_at DATETIME"))
        connection.execute(text("ALTER TABLE clinicians ADD COLUMN verification_attempts INTEGER NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE clinicians ADD COLUMN verification_sent_at DATETIME"))


_upgrade_existing_database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load TensorFlow and the five models now, so the first upload is not slow.
    try:
        predictor.get_state()
        logger.info("Model loaded and ready.")
    except Exception:
        logger.exception("Model could not be loaded at startup; uploads will fail until it can.")
    yield


app = FastAPI(title="Cervical Screening Decision Support API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(images.router)


@app.get("/health")
def health():
    return {"status": "ok"}