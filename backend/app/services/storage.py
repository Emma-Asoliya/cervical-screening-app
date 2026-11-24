"""File storage for uploaded images and heatmaps.

Files go to Cloudinary when it is configured, otherwise to the local
storage folder (tests and local development). Callers only ever deal with a
relative key such as "uploads/<name>.jpg"; that key is what the database stores.
"""
import secrets
import tempfile
from contextlib import contextmanager
from pathlib import Path

import cloudinary
import cloudinary.api
import cloudinary.uploader
import cloudinary.utils
import httpx

from app.config import settings

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"


def _use_cloudinary() -> bool:
    return bool(settings.cloudinary_cloud_name)


def _configure() -> None:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def _split(key: str) -> tuple[str, str]:
    """'uploads/abc.jpg' -> (Cloudinary public id, 'jpg')."""
    stem, _, ext = key.rpartition(".")
    return f"{settings.cloudinary_folder}/{stem}", ext


def new_key(folder: str, extension: str) -> str:
    return f"{folder}/{secrets.token_hex(16)}{extension}"


def save_bytes(folder: str, extension: str, data: bytes) -> str:
    key = new_key(folder, extension)
    if _use_cloudinary():
        _configure()
        public_id, _ = _split(key)
        # "authenticated" means the file has no public URL; we serve it ourselves.
        cloudinary.uploader.upload(
            data,
            public_id=public_id,
            type="authenticated",
            resource_type="image",
            overwrite=False,
        )
    else:
        absolute = STORAGE_DIR / key
        absolute.parent.mkdir(parents=True, exist_ok=True)
        absolute.write_bytes(data)
    return key


def read_bytes(key: str) -> bytes | None:
    """The file's content, or None if it does not exist."""
    if _use_cloudinary():
        _configure()
        public_id, ext = _split(key)
        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            type="authenticated",
            resource_type="image",
            format=ext,
            sign_url=True,
            secure=True,
        )
        response = httpx.get(url, timeout=30)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.content
    path = _resolve_local(key)
    return path.read_bytes() if path.is_file() else None


@contextmanager
def local_copy(key: str):
    """A real file on disk holding the stored content, for code that needs a path."""
    if not _use_cloudinary():
        yield _resolve_local(key)
        return
    data = read_bytes(key)
    if data is None:
        raise FileNotFoundError(key)
    suffix = Path(key).suffix
    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        tmp.write(data)
        tmp.flush()
        yield Path(tmp.name)


def _resolve_local(key: str) -> Path:
    path = (STORAGE_DIR / key).resolve()
    if not path.is_relative_to(STORAGE_DIR.resolve()):
        raise ValueError("Path is outside the storage folder")
    return path


resolve = _resolve_local  # local-disk path for a key (used by tests)


def delete(key: str) -> None:
    if _use_cloudinary():
        _configure()
        public_id, _ = _split(key)
        cloudinary.uploader.destroy(public_id, type="authenticated", resource_type="image", invalidate=True)
    else:
        _resolve_local(key).unlink(missing_ok=True)
