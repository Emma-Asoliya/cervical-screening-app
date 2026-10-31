from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=90)
    email: EmailStr
    password: str = Field(min_length=8, max_length=32)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 32:
            raise ValueError("Password is too long (max 32 bytes)")
        return value

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ClinicianOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    clinician_id: int
    full_name: str
    email: EmailStr
    created_at: datetime

class ImageResult(BaseModel):
    image_id: int
    predicted_class: Literal["Normal", "Abnormal"]
    confidence_score: float
    certainty_level: Literal["High", "Medium", "Low"]
    explanation: str
    model_status: str
    uploaded_at: datetime
    generated_at: datetime
    mime_type: str
    file_size_bytes: int