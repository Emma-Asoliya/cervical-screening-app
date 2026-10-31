import shutil
from dataclasses import dataclass
from pathlib import Path

from app.services import predictor, storage

REQUIRED_KEYS = {
    "predicted_class",
    "confidence_score",
    "certainty_level",
    "explanation",
    "heatmap_path",
}
VALID_CLASSES = {"Normal", "Abnormal"}
VALID_CERTAINTY = {"High", "Medium", "Low"}
HEATMAP_EXTENSIONS = {".jpg", ".jpeg", ".png"}


class PredictionError(Exception):
    """The predictor failed, or returned something that breaks the agreed contract."""


@dataclass
class Analysis:
    predicted_class: str
    confidence_score: float
    certainty_level: str
    explanation: str
    heatmap_path: str  # relative path inside the storage folder
    model_status: str


def run_analysis(image_path: Path) -> Analysis:
    try:
        raw = predictor.predict_with_explanation(str(image_path))
    except Exception as exc:
        raise PredictionError("The analysis could not be completed.") from exc

    if not isinstance(raw, dict) or not REQUIRED_KEYS.issubset(raw):
        raise PredictionError("The predictor did not return the agreed fields.")
    if raw["predicted_class"] not in VALID_CLASSES:
        raise PredictionError("The predictor returned a label other than Normal or Abnormal.")
    if raw["certainty_level"] not in VALID_CERTAINTY:
        raise PredictionError("The predictor returned an unknown certainty level.")
    try:
        score = float(raw["confidence_score"])
    except (TypeError, ValueError):
        raise PredictionError("The confidence score is not a number.") from None
    if not 0.0 <= score <= 1.0:
        raise PredictionError("The confidence score must be between 0 and 1.")
    explanation = str(raw["explanation"]).strip()
    if not explanation:
        raise PredictionError("The explanation is empty.")

    source = Path(raw["heatmap_path"])
    if source.suffix.lower() not in HEATMAP_EXTENSIONS or not source.is_file():
        raise PredictionError("The predictor did not produce a usable heatmap.")
    relative, destination = storage.new_file_path("heatmaps", source.suffix.lower())
    shutil.move(str(source), str(destination))

    return Analysis(
        predicted_class=raw["predicted_class"],
        confidence_score=score,
        certainty_level=raw["certainty_level"],
        explanation=explanation,
        heatmap_path=relative,
        model_status=predictor.MODEL_STATUS,
    )