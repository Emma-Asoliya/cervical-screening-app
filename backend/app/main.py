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