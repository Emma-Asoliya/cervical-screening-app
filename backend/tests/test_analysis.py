import numpy as np
import pytest
from PIL import Image

from backend.app.ml_models.config import settings
from app.services import predictor, storage
from app.services.analysis import PredictionError, run_analysis


def make_photo(path, seed=1, size=(640, 480)):
    rng = np.random.default_rng(seed)
    pixels = rng.integers(0, 256, (size[1], size[0], 3), dtype=np.uint8)
    Image.fromarray(pixels).save(path, quality=95)
    return path


@pytest.fixture
def sample_image(tmp_path, monkeypatch, stand_in_models):
    monkeypatch.setattr(storage, "STORAGE_DIR", tmp_path / "storage")
    return make_photo(tmp_path / "sample.jpg")


def test_real_predictor_follows_the_contract(sample_image):
    result = run_analysis(sample_image)
    assert result.predicted_class in ("Normal", "Abnormal")
    assert 0 <= result.confidence_score <= 1
    assert result.certainty_level in ("High", "Medium", "Low")
    assert result.explanation
    assert result.model_status == "research_prototype"
    assert storage.resolve(result.heatmap_path).is_file()


def test_same_image_gives_the_same_result(sample_image):
    first = run_analysis(sample_image)
    second = run_analysis(sample_image)
    assert first.predicted_class == second.predicted_class
    assert first.confidence_score == second.confidence_score


def test_confidence_is_the_probability_of_the_predicted_class(sample_image):
    state = predictor.get_state()
    small, _ = predictor.preprocess_photo(sample_image)
    probs, _ = predictor._score_and_cam_parts(state, small)
    score = float(np.mean(probs))
    raw = predictor.predict_with_explanation(str(sample_image))

    if score >= state["threshold"]:
        assert raw["predicted_class"] == "Abnormal"
        assert raw["confidence_score"] == pytest.approx(score, abs=1e-4)
    else:
        assert raw["predicted_class"] == "Normal"
        assert raw["confidence_score"] == pytest.approx(1 - score, abs=1e-4)


def test_the_threshold_decides_the_label(sample_image, monkeypatch):
    state = predictor.get_state()
    monkeypatch.setitem(state, "threshold", 0.0)
    assert predictor.predict_with_explanation(str(sample_image))["predicted_class"] == "Abnormal"
    monkeypatch.setitem(state, "threshold", 1.0)
    assert predictor.predict_with_explanation(str(sample_image))["predicted_class"] == "Normal"


def test_heatmap_is_a_real_overlay_on_the_photo(sample_image):
    raw = predictor.predict_with_explanation(str(sample_image))
    overlay = np.array(Image.open(raw["heatmap_path"]))
    original = np.array(Image.open(sample_image))
    assert overlay.shape == original.shape == (480, 640, 3)
    assert not np.array_equal(overlay, original)  # the heat was blended in
    # the blanked timestamp corner receives no heat, so it stays close to the photo
    corner = np.abs(overlay[:90, :330].astype(int) - original[:90, :330].astype(int)).mean()
    rest = np.abs(overlay[150:, :].astype(int) - original[150:, :].astype(int)).mean()
    assert corner < rest


def test_explanation_is_plain_language_with_the_disclaimer(sample_image):
    text = predictor.predict_with_explanation(str(sample_image))["explanation"]
    assert "5 model copies" in text
    assert "not validated for clinical use" in text
    assert "not a lesion location" in text


def test_preprocessing_matches_training_steps(sample_image):
    small, original = predictor.preprocess_photo(sample_image)
    assert small.shape == (192, 256, 3) and small.dtype == np.uint8
    assert original.shape == (480, 640, 3)
    # the timestamp patch is zeroed before the resize, so the top-left corner is black
    assert small[:35, :120].max() == 0


def test_wrong_photo_size_is_refused_by_the_predictor(tmp_path, stand_in_models):
    path = make_photo(tmp_path / "small.jpg", size=(400, 300))
    with pytest.raises(ValueError, match="unexpected size"):
        predictor.preprocess_photo(path)


def test_missing_model_files_fail_clearly(tmp_path, monkeypatch, sample_image):
    monkeypatch.setattr(settings, "model_dir", tmp_path / "nothing_here")
    predictor.reset()
    with pytest.raises(PredictionError):
        run_analysis(sample_image)
    with pytest.raises(predictor.ModelNotAvailableError, match="fold0.keras"):
        predictor.get_state()


def test_rejects_a_three_tier_label(sample_image, monkeypatch):
    def fake_predictor(image_path):
        return {
            "predicted_class": "Low Risk",
            "confidence_score": 0.9,
            "certainty_level": "High",
            "explanation": "x",
            "heatmap_path": "x.jpg",
        }

    monkeypatch.setattr(predictor, "predict_with_explanation", fake_predictor)
    with pytest.raises(PredictionError):
        run_analysis(sample_image)
