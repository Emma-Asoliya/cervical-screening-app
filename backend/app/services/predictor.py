"""PLACEHOLDER predictor.

Nothing here analyses the image medically. The result comes from a fingerprint
(hash) of the file, so the same image always gives the same output.

To connect the real model: keep the function name, the argument and the five
returned keys exactly as they are, replace the body, and change MODEL_STATUS.
"""

import hashlib
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.config import settings

MODEL_STATUS = "placeholder"

EXPLANATIONS = {
    "Normal": (
        "The model classified this image as Normal. "
        "Review the image alongside your clinical assessment."
    ),
    "Abnormal": (
        "The model identified image patterns it classified as Abnormal. "
        "Review the highlighted areas and use your clinical judgement."
    ),
}
LOW_CERTAINTY_NOTE = (
    " The model is less certain about this image. "
    "Review image quality and interpret the result with caution."
)


def _certainty_level(score: float) -> str:
    if score >= settings.certainty_high:
        return "High"
    if score >= settings.certainty_medium:
        return "Medium"
    return "Low"


def _make_heatmap(path: Path, seed: int) -> str:
    image = Image.open(path).convert("RGB")
    image.thumbnail((800, 800))
    rgb = np.asarray(image)
    height, width = rgb.shape[:2]

    rng = np.random.default_rng(seed)
    centre_x = rng.uniform(0.35, 0.65) * width
    centre_y = rng.uniform(0.35, 0.65) * height
    sigma = 0.15 * min(height, width)

    ys, xs = np.mgrid[0:height, 0:width]
    blob = np.exp(-((xs - centre_x) ** 2 + (ys - centre_y) ** 2) / (2 * sigma**2))

    colours = cv2.applyColorMap((blob * 255).astype(np.uint8), cv2.COLORMAP_JET)
    colours = cv2.cvtColor(colours, cv2.COLOR_BGR2RGB)
    overlay = (0.6 * rgb + 0.4 * colours).astype(np.uint8)

    handle = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    handle.close()
    Image.fromarray(overlay).save(handle.name, quality=90)
    return handle.name


def predict_with_explanation(image_path: str) -> dict:
    path = Path(image_path)
    digest = hashlib.sha256(path.read_bytes()).digest()
    seed = int.from_bytes(digest[:4], "big")

    predicted_class = "Abnormal" if seed % 2 else "Normal"
    confidence_score = round(0.52 + ((seed >> 1) % 47) / 100, 2)
    certainty_level = _certainty_level(confidence_score)

    explanation = EXPLANATIONS[predicted_class]
    if certainty_level == "Low":
        explanation += LOW_CERTAINTY_NOTE

    return {
        "predicted_class": predicted_class,
        "confidence_score": confidence_score,
        "certainty_level": certainty_level,
        "explanation": explanation,
        "heatmap_path": _make_heatmap(path, seed),
    }