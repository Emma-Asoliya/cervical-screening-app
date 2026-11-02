"""Real predictor: the five fold models from the notebook, averaged, with Grad-CAM.

This is a port of section 12 of Cervical_Screening_Model_v5_after_acid_only.ipynb.
The preprocessing, the ensemble, the threshold and the Grad-CAM steps are the same
as in the notebook, so a photo gives the same score here as it does there.

The contract with app.services.analysis is unchanged: predict_with_explanation()
takes an image path and returns the five keys below. Nothing else in the app needs
to know how the prediction is made.

Files expected in settings.model_dir (copy them from the notebook's
OUT/models/A1_small_cnn_post folder):
    fold0.keras ... fold4.keras
    config.json            (optional; supplies the decision threshold)

Check one photo against the notebook from the command line:
    python -m app.services.predictor path/to/photo.jpg
"""

import json
import logging
import tempfile
import threading
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

MODEL_STATUS = "research_prototype"

# Must match the notebook (section 3 and the export config).
MODEL_W, MODEL_H = 256, 192
SOURCE_W, SOURCE_H = 640, 480
PATCH_W, PATCH_H = 345, 100  # timestamp area that is zeroed before resizing
N_FOLDS = 5
DEFAULT_THRESHOLD = 0.4866  # Youden point from the notebook; config.json overrides it

DISCLAIMER = (
    "This is an experimental research prototype, not validated for clinical use. "
    "The highlighted areas show what the model used. They are a review aid, "
    "not a lesion location."
)
LOW_CERTAINTY_NOTE = (
    " The model is less certain about this image. "
    "Review image quality and interpret the result with caution."
)

_lock = threading.Lock()
_state: dict | None = None


class ModelNotAvailableError(RuntimeError):
    """The model files are missing or could not be loaded."""


# --------------------------------------------------------------------------- loading


def _load_state() -> dict:
    # TensorFlow is slow to import, so it is only loaded when the first photo arrives.
    import tensorflow as tf

    model_dir = Path(settings.model_dir)
    paths = [model_dir / f"fold{k}.keras" for k in range(N_FOLDS)]
    missing = [p.name for p in paths if not p.is_file()]
    if missing:
        raise ModelNotAvailableError(
            f"Model files not found in {model_dir}: {', '.join(missing)}"
        )

    threshold = DEFAULT_THRESHOLD
    config_path = model_dir / "config.json"
    if config_path.is_file():
        threshold = float(json.loads(config_path.read_text())["threshold"])

    grad_models = []
    for path in paths:
        model = tf.keras.models.load_model(path, compile=False)
        conv = next(
            (l for l in reversed(model.layers) if isinstance(l, tf.keras.layers.Conv2D)),
            None,
        )
        if conv is None:
            raise ModelNotAvailableError(f"{path.name} has no Conv2D layer for Grad-CAM")
        # Outputs: last spatial feature map, and the abnormal probability.
        grad_models.append(tf.keras.Model(model.input, [conv.output, model.output]))

    logger.info("Loaded %d fold models, threshold %.4f", len(grad_models), threshold)
    return {"tf": tf, "grad_models": grad_models, "threshold": threshold}


def get_state() -> dict:
    global _state
    if _state is None:
        with _lock:
            if _state is None:
                _state = _load_state()
    return _state


def reset() -> None:
    """Forget the loaded models (used by the tests, and after replacing model files)."""
    global _state
    with _lock:
        _state = None


# ---------------------------------------------------------------------- preprocessing


def preprocess_photo(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Return (model input 192x256x3 uint8, original RGB array).

    Same steps as training: RGB, require 640x480, zero the timestamp patch,
    LANCZOS resize. The model rescales 0-255 to 0-1 itself.
    """
    with Image.open(path) as im:
        im = im.convert("RGB")
        if im.size != (SOURCE_W, SOURCE_H):
            raise ValueError(
                f"unexpected size {im.size}: the timestamp mask assumes "
                f"{SOURCE_W}x{SOURCE_H} photos"
            )
        original = np.array(im)
    masked = original.copy()
    masked[:PATCH_H, :PATCH_W] = 0
    small = np.array(Image.fromarray(masked).resize((MODEL_W, MODEL_H), Image.LANCZOS))
    return small, original


# ------------------------------------------------------------------------- inference


def _unit(a: np.ndarray) -> np.ndarray:
    return a / (a.max() + 1e-8)


def _score_and_cam_parts(state: dict, small: np.ndarray):
    """Run every fold model once on the photo and on its mirror image.

    Returns the abnormal probability of each model (un-flipped photo, as validated)
    and, per model, the pieces needed to build a Grad-CAM for either class.
    """
    tf = state["tf"]
    batch = np.stack([small, small[:, ::-1, :]]).astype(np.float32)  # [photo, mirrored]
    batch = tf.convert_to_tensor(np.ascontiguousarray(batch))

    probs, parts = [], []
    for gm in state["grad_models"]:
        with tf.GradientTape() as tape:
            conv, prob = gm(batch, training=False)
            target = prob[:, 0]
        grads = tape.gradient(target, conv)
        weights = tf.reduce_mean(grads, axis=(1, 2), keepdims=True)
        probs.append(float(prob.numpy()[0, 0]))
        parts.append((weights.numpy(), conv.numpy()))
    return probs, parts


def _gradcam(parts, sign: int) -> np.ndarray:
    """Heatmap (192x256, values 0-1) explaining the predicted class.

    sign=+1 explains 'abnormal'; sign=-1 explains 'normal' (the gradient is flipped).
    Averaged over the five models and over the mirrored photo.
    """
    cams = []
    for weights, conv in parts:
        cam = np.maximum((sign * weights * conv).sum(axis=-1), 0)  # (2, h, w)
        cams.append(_unit(cam[0]))
        cams.append(_unit(cam[1][:, ::-1]))  # un-mirror the second one
    cam = np.mean(cams, axis=0).astype(np.float32)
    cam = cv2.resize(cam, (MODEL_W, MODEL_H), interpolation=cv2.INTER_LINEAR)
    # The blanked timestamp area carries no information.
    cam[: round(MODEL_H * PATCH_H / SOURCE_H), : round(MODEL_W * PATCH_W / SOURCE_W)] = 0
    return _unit(cam)


def _overlay(original: np.ndarray, cam: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    """Blend the heatmap onto the original photo. Cool areas stay see-through."""
    h, w = original.shape[:2]
    big = np.clip(cv2.resize(cam, (w, h), interpolation=cv2.INTER_LINEAR), 0, 1)
    colour_bgr = cv2.applyColorMap((big * 255).astype(np.uint8), cv2.COLORMAP_JET)
    colour = cv2.cvtColor(colour_bgr, cv2.COLOR_BGR2RGB)
    a = (alpha * big)[..., None]
    return (original * (1 - a) + colour * a).astype(np.uint8)


# -------------------------------------------------------------------------- wording


def _certainty_level(confidence: float) -> str:
    if confidence >= settings.certainty_high:
        return "High"
    if confidence >= settings.certainty_medium:
        return "Medium"
    return "Low"


def _explanation(label: str, score: float, threshold: float, agree: int, certainty: str) -> str:
    text = (
        f"The model classified this image as {label}. "
        f"Its abnormal score was {score:.2f}; scores of {threshold:.2f} or above are "
        f"classed as Abnormal. {agree} of the {N_FOLDS} model copies reached the same result. "
        "The heatmap marks, in red and yellow, the image areas that pushed the score "
        f"towards {label}. "
    )
    if certainty == "Low":
        text = text.rstrip() + LOW_CERTAINTY_NOTE + " "
    return (text + DISCLAIMER).strip()


# ------------------------------------------------------------------------ the contract


def predict_with_explanation(image_path: str) -> dict:
    path = Path(image_path)
    state = get_state()
    threshold = state["threshold"]

    small, original = preprocess_photo(path)
    with _lock:  # one photo at a time: the models are tiny, and this keeps TensorFlow calm
        probs, parts = _score_and_cam_parts(state, small)

    score = float(np.mean(probs))
    abnormal = score >= threshold
    predicted_class = "Abnormal" if abnormal else "Normal"
    agree = sum((p >= threshold) == abnormal for p in probs)

    # Confidence is the probability of the class that was predicted.
    confidence_score = round(score if abnormal else 1.0 - score, 4)
    certainty_level = _certainty_level(confidence_score)

    cam = _gradcam(parts, sign=1 if abnormal else -1)
    overlay = _overlay(original, cam)
    handle = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    handle.close()
    Image.fromarray(overlay).save(handle.name, quality=90)

    return {
        "predicted_class": predicted_class,
        "confidence_score": confidence_score,
        "certainty_level": certainty_level,
        "explanation": _explanation(predicted_class, score, threshold, agree, certainty_level),
        "heatmap_path": handle.name,
    }


if __name__ == "__main__":
    import sys

    result = predict_with_explanation(sys.argv[1])
    state = get_state()
    small, _ = preprocess_photo(Path(sys.argv[1]))
    probs, _ = _score_and_cam_parts(state, small)
    print(f"abnormal score (compare with the notebook's 'score'): {np.mean(probs):.4f}")
    print(f"threshold: {state['threshold']:.4f}")
    print(json.dumps(result, indent=2))
