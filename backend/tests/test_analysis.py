import numpy as np
import pytest
from PIL import Image

from app.services import predictor, storage
from app.services.analysis import PredictionError, run_analysis


@pytest.fixture
def sample_image(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "STORAGE_DIR", tmp_path / "storage")
    path = tmp_path / "sample.jpg"
    rng = np.random.default_rng(1)
    Image.fromarray(rng.integers(0, 256, (300, 400, 3), dtype=np.uint8)).save(path)
    return path


def test_placeholder_follows_the_contract(sample_image):
    result = run_analysis(sample_image)
    assert result.predicted_class in ("Normal", "Abnormal")
    assert 0 <= result.confidence_score <= 1
    assert result.certainty_level in ("High", "Medium", "Low")
    assert result.explanation
    assert result.model_status == "placeholder"
    assert storage.resolve(result.heatmap_path).is_file()


def test_same_image_gives_the_same_result(sample_image):
    first = run_analysis(sample_image)
    second = run_analysis(sample_image)
    assert first.predicted_class == second.predicted_class
    assert first.confidence_score == second.confidence_score


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