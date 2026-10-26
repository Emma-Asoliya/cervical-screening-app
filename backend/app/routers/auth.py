from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_clinician
from app.models import Clinician
from app.schemas import ClinicianOut, SignupRequest, TokenResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=ClinicianOut, status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(Clinician).where(Clinician.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    clinician = Clinician(
        full_name=data.full_name.strip(),
        email=email,
        password_hash=hash_password(data.password),
    )
    db.add(clinician)
    db.commit()
    db.refresh(clinician)
    return Clinician

@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    clinician = db.scalar(
        select(Clinician).where(Clinician.email == form.username.lower())
    )

    if clinician is None or not verify_password(form.password, clinician.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(access_token=create_access_token(clinician.clinician_id))

@router.get("/me", response_model=ClinicianOut)
def me(current: Clinician = Depends(get_current_clinician)):
    return current