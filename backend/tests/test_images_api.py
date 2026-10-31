from io import BytesIO

import numpy as np
from PIL import Image, ImageFilter

from app.config import settings
from app.services import predictor


def make_jpeg(seed=0, blur=0):
    rng = np.random.default_rng(seed)
    image = Image.fromarray(rng.integers(0, 256, (400, 400, 3), dtype=np.uint8))
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def login_headers(client, email="a@example.com", name="Test Clinician"):
    password = "correct-horse-1"
    client.post("/auth/signup", json={"full_name": name, "email": email, "password": password})
    response = client.post("/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def upload(client, headers, data, filename="photo.jpg", content_type="image/jpeg", ignore=False):
    form = {"ignore_quality_warning": "true"} if ignore else {}
    return client.post(
        "/images",
        files={"file": (filename, data, content_type)},
        data=form,
        headers=headers,
    )


def test_upload_needs_login(client):
    response = client.post("/images", files={"file": ("a.jpg", make_jpeg(), "image/jpeg")})
    assert response.status_code == 401


def test_upload_returns_a_result(client):
    headers = login_headers(client)
    response = upload(client, headers, make_jpeg())
    assert response.status_code == 201
    body = response.json()
    assert body["predicted_class"] in ("Normal", "Abnormal")
    assert body["model_status"] == "placeholder"
    assert "file_path" not in body
    assert "file_name" not in body
    assert "heatmap_path" not in body


def test_rejects_a_file_that_is_not_an_image(client):
    headers = login_headers(client)
    response = upload(client, headers, b"just some text", filename="notes.jpg")
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_rejects_a_file_over_the_size_limit(client, monkeypatch):
    headers = login_headers(client)
    monkeypatch.setattr(settings, "max_upload_bytes", 1000)
    response = upload(client, headers, make_jpeg())
    assert response.status_code == 413


def test_blurry_image_warns_then_can_continue(client):
    headers = login_headers(client)
    blurry = make_jpeg(blur=20)

    warning = upload(client, headers, blurry)
    assert warning.status_code == 422
    detail = warning.json()["detail"]
    assert detail["code"] == "quality_warning"
    assert "blurry" in detail["issues"]
    assert client.get("/images", headers=headers).json() == []

    assert upload(client, headers, blurry, ignore=True).status_code == 201


def test_another_clinician_cannot_see_the_image(client):
    owner = login_headers(client, "owner@example.com")
    other = login_headers(client, "other@example.com", "Other Clinician")
    image_id = upload(client, owner, make_jpeg()).json()["image_id"]

    for path in (f"/images/{image_id}", f"/images/{image_id}/file", f"/images/{image_id}/heatmap"):
        assert client.get(path, headers=owner).status_code == 200
        assert client.get(path, headers=other).status_code == 404
        assert client.get(path).status_code == 401

    assert client.get("/images", headers=other).json() == []


def test_history_lists_only_own_images_newest_first(client):
    headers = login_headers(client)
    first = upload(client, headers, make_jpeg(seed=1)).json()["image_id"]
    second = upload(client, headers, make_jpeg(seed=2)).json()["image_id"]
    ids = [item["image_id"] for item in client.get("/images", headers=headers).json()]
    assert ids == [second, first]


def test_failed_analysis_leaves_nothing_behind(client, tmp_path, monkeypatch):
    headers = login_headers(client)

    def broken(image_path):
        raise RuntimeError("model failed")

    monkeypatch.setattr(predictor, "predict_with_explanation", broken)
    response = upload(client, headers, make_jpeg())

    assert response.status_code == 500
    assert client.get("/images", headers=headers).json() == []
    assert [p for p in (tmp_path / "storage").rglob("*") if p.is_file()] == []


def test_original_file_name_is_never_stored_or_returned(client, tmp_path):
    headers = login_headers(client)
    response = upload(client, headers, make_jpeg(), filename="Mary_Okafor_cervix.jpg")
    assert response.status_code == 201
    assert "Mary" not in response.text

    stored = [p.name for p in (tmp_path / "storage").rglob("*") if p.is_file()]
    assert stored
    assert all("Mary" not in name for name in stored)