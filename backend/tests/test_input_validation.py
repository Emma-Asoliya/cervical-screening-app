"""Testing with different inputs: how the upload endpoint reacts to unusual files.

Every case goes through the real API (POST /images) with a logged-in clinician, so
these are integration tests: route -> validation -> quality check -> model -> database.
"""

from io import BytesIO

import numpy as np
import pytest
from PIL import Image

PASSWORD = "correct-horse-1"


# ---- helpers (kept in this file so it can be copied on its own) ------------------


def noise(size=(640, 480), mode="RGB", seed=0):
    """A sharp, mid-brightness test photo: random noise passes the quality checks."""
    rng = np.random.default_rng(seed)
    channels = {"RGB": 3, "RGBA": 4, "L": None}[mode]
    shape = (size[1], size[0]) if channels is None else (size[1], size[0], channels)
    return Image.fromarray(rng.integers(0, 256, shape, dtype=np.uint8), mode)


def encode(image, fmt="JPEG", **kwargs):
    buffer = BytesIO()
    image.save(buffer, format=fmt, **kwargs)
    return buffer.getvalue()


def headers(client, email="inputs@example.com"):
    client.post("/auth/signup", json={"full_name": "Input Tester", "email": email, "password": PASSWORD})
    token = client.post("/auth/login", data={"username": email, "password": PASSWORD}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def upload(client, auth, data, filename="photo.jpg", content_type="image/jpeg", ignore=False):
    return client.post(
        "/images",
        files={"file": (filename, data, content_type)},
        data={"ignore_quality_warning": "true"} if ignore else {},
        headers=auth,
    )


# ---- inputs the app should accept ------------------------------------------------


@pytest.mark.parametrize(
    "label,data,filename,content_type",
    [
        ("JPEG", encode(noise(), "JPEG", quality=90), "a.jpg", "image/jpeg"),
        ("PNG", encode(noise(), "PNG"), "a.png", "image/png"),
        ("grayscale JPEG", encode(noise(mode="L"), "JPEG"), "gray.jpg", "image/jpeg"),
        ("PNG with transparency", encode(noise(mode="RGBA"), "PNG"), "alpha.png", "image/png"),
    ],
)
def test_valid_photos_are_analysed(client, label, data, filename, content_type):
    response = upload(client, headers(client), data, filename, content_type)
    assert response.status_code == 201, f"{label}: {response.text}"
    body = response.json()
    assert body["predicted_class"] in ("Normal", "Abnormal")
    assert 0.0 <= body["confidence_score"] <= 1.0
    assert body["certainty_level"] in ("High", "Medium", "Low")


def test_a_rotated_phone_photo_is_straightened_before_the_size_check(client):
    """Phones store portrait photos as landscape pixels plus an EXIF 'rotate' flag."""
    sideways = noise(size=(480, 640))  # 480 wide x 640 tall
    exif = Image.Exif()
    exif[0x0112] = 6  # orientation: rotate 90 degrees clockwise when displayed
    response = upload(client, headers(client), encode(sideways, "JPEG", exif=exif))
    assert response.status_code == 201  # after rotation it is 640 x 480


def test_the_heatmap_endpoint_returns_a_640_by_480_image(client):
    auth = headers(client)
    image_id = upload(client, auth, encode(noise())).json()["image_id"]
    heatmap = client.get(f"/images/{image_id}/heatmap", headers=auth)
    assert heatmap.status_code == 200
    assert heatmap.headers["content-type"] == "image/jpeg"
    assert heatmap.headers["cache-control"] == "private, no-store"
    assert Image.open(BytesIO(heatmap.content)).size == (640, 480)


def test_a_dark_photo_is_warned_about_but_can_be_analysed_anyway(client):
    auth = headers(client)
    dark = encode(Image.new("RGB", (640, 480), (5, 5, 5)))
    warning = upload(client, auth, dark)
    assert warning.status_code == 422
    assert warning.json()["detail"]["code"] == "quality_warning"
    assert "too_dark" in warning.json()["detail"]["issues"]
    assert upload(client, auth, dark, ignore=True).status_code == 201


# ---- inputs the app should refuse, with a clear message --------------------------


def refused(client, data, status=422, **kwargs):
    response = upload(client, headers(client), data, **kwargs)
    assert response.status_code == status, response.text
    return response.json()["detail"]


def test_portrait_photo_is_refused_with_the_required_size(client):
    assert "640 x 480" in refused(client, encode(noise(size=(480, 640))))


def test_a_photo_that_is_too_small_is_refused(client):
    assert "too small" in refused(client, encode(noise(size=(100, 100))))


@pytest.mark.parametrize("fmt,ext,mime", [("GIF", "a.gif", "image/gif"), ("BMP", "a.bmp", "image/bmp"), ("WEBP", "a.webp", "image/webp")])
def test_other_image_types_are_refused(client, fmt, ext, mime):
    data = encode(noise(), fmt)
    assert "not supported" in refused(client, data, filename=ext, content_type=mime)


def test_an_empty_file_is_refused(client):
    assert "not a valid image" in refused(client, b"")


def test_a_truncated_jpeg_is_refused_not_crashed_on(client):
    data = encode(noise(), "JPEG", quality=90)
    assert "not a valid image" in refused(client, data[: len(data) // 3])


def test_an_image_with_too_many_pixels_is_refused(client):
    """6000 x 6000 = 36 million pixels. It compresses to a small PNG, so it gets past
    the 5 MB file-size limit and must be stopped by the pixel limit instead."""
    bomb = encode(Image.new("RGB", (6000, 6000)), "PNG")
    assert len(bomb) < 5 * 1024 * 1024
    assert "too many pixels" in refused(client, bomb, filename="big.png", content_type="image/png")


def test_a_request_with_no_file_is_refused(client):
    response = client.post("/images", headers=headers(client))
    assert response.status_code == 422


def test_a_malicious_file_name_cannot_reach_the_file_system(client, tmp_path):
    response = upload(client, headers(client), encode(noise()), filename="../../../etc/passwd.jpg")
    assert response.status_code == 201
    stored = [p for p in (tmp_path / "storage").rglob("*") if p.is_file()]
    assert stored and all(".." not in p.name and "passwd" not in p.name for p in stored)
    assert all((tmp_path / "storage") in p.parents for p in stored)