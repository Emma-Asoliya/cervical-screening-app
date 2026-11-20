import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_clinician
from app.models import Clinician
from app.schemas import (
    ClinicianOut,
    MessageResponse,
    ResendRequest,
    SignupRequest,
    TokenResponse,
    VerifyRequest,
    VerifyResponse,
)
from app.security import (
    burn_password_check,
    create_access_token,
    hash_password,
    verify_password,
)
from app.services import email as email_service

router = APIRouter(prefix="/auth", tags=["auth"])

GENERIC_RESEND = "If that account exists and is not verified yet, a new code has been sent."


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _issue_code(clinician: Clinician, db: Session) -> None:
    """Make a new 6-digit code, store only its hash, and email it."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    clinician.verification_code_hash = hash_password(code)
    clinician.verification_expires_at = _now() + timedelta(minutes=settings.verification_code_minutes)
    clinician.verification_attempts = 0
    clinician.verification_sent_at = _now()
    db.commit()
    email_service.send_verification_email(clinician.email, clinician.full_name, code)


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
        email_verified=not settings.require_email_verification,
    )
    db.add(clinician)
    db.commit()
    db.refresh(clinician)
    if settings.require_email_verification:
        _issue_code(clinician, db)
        db.refresh(clinician)
    return clinician


@router.post("/verify", response_model=VerifyResponse)
def verify(data: VerifyRequest, db: Session = Depends(get_db)):
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "That code is not valid or has expired")
    clinician = db.scalar(select(Clinician).where(Clinician.email == data.email.lower()))
    if clinician is None or not clinician.verification_code_hash:
        if clinician is None:
            burn_password_check()
        if clinician is not None and clinician.email_verified:
            return VerifyResponse(message="Email already verified")
        raise invalid
    if (
        clinician.verification_expires_at is None
        or _utc(clinician.verification_expires_at) < _now()
        or clinician.verification_attempts >= settings.verification_max_attempts
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "That code has expired or was tried too many times. Request a new one.",
        )
    if not verify_password(data.code, clinician.verification_code_hash):
        clinician.verification_attempts += 1
        db.commit()
        raise invalid
    clinician.email_verified = True
    clinician.verification_code_hash = None
    clinician.verification_expires_at = None
    db.commit()
    return VerifyResponse(message="Email verified",
                          access_token=create_access_token(clinician.clinician_id),)


@router.post("/resend", response_model=MessageResponse)
def resend(data: ResendRequest, db: Session = Depends(get_db)):
    clinician = db.scalar(select(Clinician).where(Clinician.email == data.email.lower()))
    if clinician is None or clinician.email_verified:
        return MessageResponse(message=GENERIC_RESEND)  # does not reveal which emails exist
    if clinician.verification_sent_at is not None:
        wait = settings.verification_resend_seconds - (
            _now() - _utc(clinician.verification_sent_at)
        ).total_seconds()
        if wait > 0:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Please wait {int(wait) + 1} seconds before asking for another code",
            )
    _issue_code(clinician, db)
    return MessageResponse(message=GENERIC_RESEND)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    clinician = db.scalar(
        select(Clinician).where(Clinician.email == form.username.lower())
    )

    if clinician is None:
        burn_password_check()
    if clinician is None or not verify_password(form.password, clinician.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if settings.require_email_verification and not clinician.email_verified:
        # Only reached with the right password, so it does not leak which emails exist.
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="email_not_verified")
    return TokenResponse(access_token=create_access_token(clinician.clinician_id))


@router.get("/me", response_model=ClinicianOut)
def me(current: Clinician = Depends(get_current_clinician)):
    return current

