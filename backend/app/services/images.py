from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import settings

FORMAT_TO_MIME = {
    "JPEG" : "image/jpeg", 
    "MPO" : "image/jpeg",
    "PNG" : "image/png",
}

class InvalidImageError(Exception):
    """The upload cannot be used. The message is safe to show to the user."""

def load_image(contents: bytes) -> tuple[Image.Image, str]:
    try:
        image = Image.open(BytesIO(contents))
        image_format = image.format
        if image_format not in FORMAT_TO_MIME:
            raise InvalidImageError("This file type is not supported. Choose a JPEG or PNG image.")

        width, height = image.size
        if width * height > settings.max_image_pixels:
            raise InvalidImageError("This image has too many pixels. Choose a smaller image.")
        if min(width, height) < settings.min_image_side:
            raise InvalidImageError(
                f"This image is too small. Its shorter side must be at least"
                f"{settings.min_image_side} pixels."
            )

        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
    except InvalidImageError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise InvalidImageError("This file is not a valid image.") from None

    return image, FORMAT_TO_MIME[image_format]

def encode_clean(image: Image.Image, mime_type: str) -> tuple[bytes, str]:
    buffer = BytesIO()
    if mime_type == "image/jpeg":
        image.save(buffer, format="JPEG", quality=95)
        extension = ".jpg"
    else:
        image.save(buffer, format="PNG")
        extension = ".png"
    return buffer.getvalue(), extension

    