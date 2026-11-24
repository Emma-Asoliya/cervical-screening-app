from io import BytesIO

import numpy as np
import pytest
from PIL import Image, ImageFilter

from app.services.images import InvalidImageError, encode_clean, load_image
from app.services.quality import check_quality


def make_noise(low=0, high=256, size=(512, 512)):
    rng = np.random.default_rng(0)
    data = rng.integers(low, high, (size[1], size[0], 3), dtype=np.uint8)
    return Image.fromarray(data)


def to_bytes(image, image_format="JPEG", **options):
    buffer = BytesIO()
    image.save(buffer, format=image_format, **options)
    return buffer.getvalue()


def test_accepts_jpeg_and_png():
    _, mime = load_image(to_bytes(make_noise(), "JPEG"))
    assert mime == "image/jpeg"
    _, mime = load_image(to_bytes(make_noise(), "PNG"))
    assert mime == "image/png"


def test_rejects_text_pretending_to_be_an_image():
    with pytest.raises(InvalidImageError):
        load_image(b"this is not an image")


def test_rejects_other_image_formats():
    with pytest.raises(InvalidImageError):
        load_image(to_bytes(make_noise(), "BMP"))


def test_rejects_small_images():
    with pytest.raises(InvalidImageError):
        load_image(to_bytes(make_noise(size=(100, 100))))


def test_cleaning_removes_metadata():
    exif = Image.Exif()
    exif[0x010E] = "Patient: Example"  # the ImageDescription tag
    original = to_bytes(make_noise(), "JPEG", exif=exif)
    assert len(Image.open(BytesIO(original)).getexif()) > 0  # the test image has metadata

    image, mime = load_image(original)
    cleaned, extension = encode_clean(image, mime)

    assert extension == ".jpg"
    assert len(Image.open(BytesIO(cleaned)).getexif()) == 0


def test_sharp_image_has_no_issues():
    assert check_quality(make_noise()).issues == []


def test_blurry_image_is_flagged():
    blurred = make_noise().filter(ImageFilter.GaussianBlur(20))
    assert "blurry" in check_quality(blurred).issues


def test_dark_image_is_flagged():
    report = check_quality(make_noise(0, 40))
    assert "too_dark" in report.issues
    assert "blurry" not in report.issues


def test_bright_image_is_flagged():
    report = check_quality(make_noise(216, 256))
    assert "too_bright" in report.issues
    assert "blurry" not in report.issues