from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

def hash_password(password: str) -> str:
    """Turn a password into a salted bcrypt hash. The password is never stored."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 32:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

def create_access_token(clinician_id: int) -> str:
    """Make a signed token that says who the user is and when it expires."""
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": str(clinician_id), "exp":expires}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str) -> int | None:
    """Return the clinician id if the token is valid and not expired, else None"""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None