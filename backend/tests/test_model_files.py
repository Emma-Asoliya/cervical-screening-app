"""Checks on the real model files in backend/app/ml_models/.

These tests are skipped automatically when the five fold models are not there, so they
never block someone who has not copied the model files yet. They do NOT measure
accuracy: the honest accuracy figure is the patient-level AUC from the notebook's
cross-validation. They check that the files loaded are the right shape and behave.
"""

import json

import numpy as np
import pytest
from PIL import Image

from app.config import settings
from app.services import predictor

FOLD_FILES = [settings.model_dir / f"fold{k}.keras" for k in range(5)]

pytestmark = pytest.mark.skipif(
    not all(p.is_file() for p in FOLD_FILES),
    reason="model files not in backend/app/ml_models/",
)


@pytest.fixture(scope="module")
def state():
    predictor.reset()
    yield predictor.get_state()
    predictor.reset()


def make_photo(path, seed=0, kind="noise"):
    rng = np.random.default_rng(seed)
    if kind == "noise":
        pixels = rng.integers(0, 256, (480, 640, 3), dtype=np.uint8)
    elif kind == "tint":  # a colour gradient: different seeds look clearly different
        colour = rng.integers(40, 220, 3)
        ramp = np.linspace(0.3, 1.0, 640)[None, :, None] * np.linspace(0.5, 1.0, 480)[:, None, None]
        pixels = np.clip(colour[None, None, :] * ramp, 0, 255).astype(np.uint8)
    elif kind == "black":
        pixels = np.zeros((480, 640, 3), dtype=np.uint8)
    else:
        pixels = np.full((480, 640, 3), 255, dtype=np.uint8)
    Image.fromarray(pixels).save(path, quality=95)
    return str(path)


def test_five_models_are_loaded(state):
    assert len(state["grad_models"]) == 5


def test_every_model_takes_192x256_colour_and_gives_one_probability(state):
    for grad_model in state["grad_models"]:
        assert grad_model.input_shape == (None, 192, 256, 3)
        assert grad_model.outputs[1].shape[-1] == 1  # one sigmoid output


def test_the_threshold_is_a_sensible_probability(state):
    assert 0.0 < state["threshold"] < 1.0


def test_config_json_matches_the_files_if_present(state):
    config_path = settings.model_dir / "config.json"
    if not config_path.is_file():
        pytest.skip("config.json not copied (the default threshold is used)")
    config = json.loads(config_path.read_text())
    assert config["files"] == [f"fold{k}.keras" for k in range(5)]
    assert config["threshold"] == pytest.approx(state["threshold"])
    assert config["input"]["height"] == 192 and config["input"]["width"] == 256


def test_scores_are_valid_probabilities_for_very_different_photos(state, tmp_path):
    for kind in ("noise", "black", "white"):
        small, _ = predictor.preprocess_photo(make_photo(tmp_path / f"{kind}.jpg", kind=kind))
        probs, _ = predictor._score_and_cam_parts(state, small)
        assert len(probs) == 5
        assert all(0.0 <= p <= 1.0 and np.isfinite(p) for p in probs), (kind, probs)


def test_the_model_is_not_stuck_on_one_answer(state, tmp_path):
    """If the weights failed to load properly, every photo would score the same."""
    scores = []
    for seed in range(8):
        small, _ = predictor.preprocess_photo(make_photo(tmp_path / f"p{seed}.jpg", seed=seed, kind="tint"))
        probs, _ = predictor._score_and_cam_parts(state, small)
        scores.append(float(np.mean(probs)))
    assert np.std(scores) > 1e-4, scores


def test_the_five_models_are_different_from_each_other(state, tmp_path):
    small, _ = predictor.preprocess_photo(make_photo(tmp_path / "x.jpg", seed=3))
    probs, _ = predictor._score_and_cam_parts(state, small)
    assert len({round(p, 6) for p in probs}) > 1  # five distinct fold models, not one copy


def test_the_full_contract_works_with_the_real_models(state, tmp_path):
    result = predictor.predict_with_explanation(make_photo(tmp_path / "full.jpg", seed=5))
    assert result["predicted_class"] in ("Normal", "Abnormal")
    assert 0.0 <= result["confidence_score"] <= 1.0
    assert result["certainty_level"] in ("High", "Medium", "Low")
    assert "not validated for clinical use" in result["explanation"]
    assert Image.open(result["heatmap_path"]).size == (640, 480)