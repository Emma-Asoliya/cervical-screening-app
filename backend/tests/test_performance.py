"""Performance tests: the analysis must stay fast enough for a clinician to wait for.

The limits are deliberately generous so they pass on a low-end laptop. They exist to
catch a real regression (for example, reloading the model on every request).
Run with  pytest tests/test_performance.py -s  to see the measured times.
"""

import statistics
import time
from io import BytesIO

import numpy as np
import pytest
from PIL import Image

from app.services import predictor

WARM_PREDICTION_LIMIT_S = 3.0
UPLOAD_P95_LIMIT_S = 5.0
RUNS = 10


def photo_bytes(seed):
    rng = np.random.default_rng(seed)
    buffer = BytesIO()
    Image.fromarray(rng.integers(0, 256, (480, 640, 3), dtype=np.uint8)).save(buffer, "JPEG", quality=90)
    return buffer.getvalue()


def summarise(label, times):
    times = sorted(times)
    p95 = times[min(len(times) - 1, int(len(times) * 0.95))]
    print(f"\n{label}: n={len(times)} median={statistics.median(times):.3f}s "
          f"p95={p95:.3f}s max={times[-1]:.3f}s")
    return p95


def test_the_model_is_loaded_once_and_reused(stand_in_models):
    first = predictor.get_state()
    assert predictor.get_state() is first  # same object: not reloaded per request


def test_a_warm_prediction_is_fast(stand_in_models, tmp_path):
    path = tmp_path / "photo.jpg"
    path.write_bytes(photo_bytes(0))
    predictor.predict_with_explanation(str(path))  # first call loads the models: not timed

    times = []
    for _ in range(RUNS):
        start = time.perf_counter()
        predictor.predict_with_explanation(str(path))
        times.append(time.perf_counter() - start)
    assert summarise("model + Grad-CAM + heatmap", times) < WARM_PREDICTION_LIMIT_S


def test_a_full_upload_is_fast(client):
    client.post("/auth/signup", json={"full_name": "Perf Tester", "email": "perf@example.com", "password": "correct-horse-1"})
    token = client.post("/auth/login", data={"username": "perf@example.com", "password": "correct-horse-1"}).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    client.post("/images", files={"file": ("w.jpg", photo_bytes(99), "image/jpeg")}, headers=auth)  # warm-up

    times = []
    for seed in range(RUNS):
        start = time.perf_counter()
        response = client.post("/images", files={"file": ("p.jpg", photo_bytes(seed), "image/jpeg")}, headers=auth)
        times.append(time.perf_counter() - start)
        assert response.status_code == 201
    assert summarise("POST /images end to end", times) < UPLOAD_P95_LIMIT_S


def test_login_is_not_slow_enough_to_annoy_but_not_instant(client):
    """bcrypt is slow on purpose (it slows password guessing). Check it stays reasonable."""
    client.post("/auth/signup", json={"full_name": "Perf Tester", "email": "p2@example.com", "password": "correct-horse-1"})
    times = []
    for _ in range(5):
        start = time.perf_counter()
        client.post("/auth/login", data={"username": "p2@example.com", "password": "correct-horse-1"})
        times.append(time.perf_counter() - start)
    median = statistics.median(times)
    print(f"\nlogin median = {median:.3f}s")
    assert 0.02 < median < 1.5