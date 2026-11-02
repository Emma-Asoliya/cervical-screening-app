import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-real-use")
os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.ml_models.config import settings
from app.database import Base, get_db
from app.main import app
from app.services import predictor, storage


def build_small_cnn():
    """The exact architecture the notebook trains (A1 small CNN), random weights."""
    import tensorflow as tf

    inp = tf.keras.Input(shape=(192, 256, 3))
    x = tf.keras.layers.Rescaling(1 / 255.0)(inp)
    x = tf.keras.layers.RandomFlip("horizontal")(x)
    x = tf.keras.layers.RandomRotation(0.05, fill_mode="constant", fill_value=0.0)(x)
    x = tf.keras.layers.RandomZoom(0.10, fill_mode="constant", fill_value=0.0)(x)
    x = tf.keras.layers.RandomTranslation(0.05, 0.05, fill_mode="constant", fill_value=0.0)(x)
    x = tf.keras.layers.RandomBrightness(0.10, value_range=(0.0, 1.0))(x)
    x = tf.keras.layers.RandomContrast(0.10, value_range=(0.0, 1.0))(x)
    for filters in (16, 32, 64):
        x = tf.keras.layers.Conv2D(filters, 3, activation="relu")(x)
        x = tf.keras.layers.MaxPooling2D()(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    out = tf.keras.layers.Dense(1, activation="sigmoid")(x)
    return tf.keras.Model(inp, out)


@pytest.fixture(scope="session")
def stand_in_models_dir(tmp_path_factory):
    """Five random-weight models in the same format as the real fold models.

    They test the plumbing (loading, preprocessing, Grad-CAM, the API), not accuracy.
    """
    import tensorflow as tf

    folder = tmp_path_factory.mktemp("ml_models")
    tf.keras.utils.set_random_seed(0)
    for k in range(5):
        build_small_cnn().save(folder / f"fold{k}.keras")
    return folder


@pytest.fixture
def stand_in_models(stand_in_models_dir, monkeypatch):
    """Point the predictor at the stand-in models for one test."""
    monkeypatch.setattr(settings, "model_dir", stand_in_models_dir)
    predictor.reset()
    yield stand_in_models_dir
    predictor.reset()


@pytest.fixture
def client(tmp_path, monkeypatch, stand_in_models):
    monkeypatch.setattr(storage, "STORAGE_DIR", tmp_path / "storage")

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()