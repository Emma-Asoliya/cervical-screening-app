import secrets 
from pathlib import Path

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"

def new_file_path(folder: str, extension: str) -> tuple[str, Path]:
    name = f"{secrets.token_hex(16)}{extension}"
    absolute = STORAGE_DIR / folder / name
    absolute.parent.mkdir(parents=True, exist_ok=True)
    return f"{folder}/{name}", absolute

def save_bytes(folder: str, extension: str, data: bytes) -> str:
    relative, absolute = new_file_path(folder, extension)
    absolute.write_bytes(data)
    return relative


def resolve(relative_path: str) -> Path:
    path = (STORAGE_DIR / relative_path).resolve()
    if not path.is_relative_to(STORAGE_DIR.resolve()):
        raise ValueError("Path is outside the storage folder")
    return path

def delete(relative_path: str) -> None:
    resolve(relative_path).unlink(missing_ok=True)