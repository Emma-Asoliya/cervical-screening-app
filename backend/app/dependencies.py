from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Clinician
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_clinician(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db),
) -> Clinician:
    unauthorized_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    clinician_id = decode_access_token(token)
    if clinician_id is None:
        raise unauthorized
    clinician = db.get(Clinician, clinician_id)
    if clinician is None:
        raise unauthorized
    return clinician