from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image

from app.config import settings

ANALYSIS_WIDTH = 512
CENTRE_FRACTION = 0.6

@dataclass 
class QualityReport:
    blur_score: float
    brightness: float
    issues: list[str]

def check_quality(image: Image.Image) -> QualityReport:
    gray = np.asarray(image.convert("L"))
    height, width = gray.shape

    if width > ANALYSIS_WIDTH:
        new_height = max(1, round(height * ANALYSIS_WIDTH / width))
        gray = cv2.resize(gray, (ANALYSIS_WIDTH, new_height), interpolation=cv2.INTER_AREA)
        height, width = gray.shape

    margin_y = int(height * (1 - CENTRE_FRACTION) / 2)
    margin_x = int(width * (1 - CENTRE_FRACTION) / 2)
    centre = gray[margin_y : height - margin_y, margin_x : width - margin_x]

    blur_score = float(cv2.Laplacian(centre, cv2.CV_64F).var())
    brightness = float(centre.mean())

    issues = []
    if blur_score < settings.blur_threshold:
        issues.append("blurry")
    if brightness < settings.brightness_min:
        issues.append("too_dark")
    elif brightness > settings.brightness_max:
        issues.append("too_bright")

    return QualityReport(blur_score=blur_score, brightness=brightness, issues=issues)