from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Clinician(Base):
    __tablename__ = "clinicians"

    clinician_id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    images: Mapped[list["CervixImage"]] = relationship(
        back_populates="clinician", cascade="all, delete-orphan"
    )

class CervixImage(Base):
    __tablename__ = "cervix_images"

    image_id: Mapped[int] = mapped_column(primary_key=True)
    clinician_id: Mapped[int] = mapped_column(
        ForeignKey("clinicians.clinician_id"), index=True
    )
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(50))
    file_size_bytes: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    clinician: Mapped["Clinician"] = relationship(back_populates="images")
    result: Mapped["PredictionResult | None"] = relationship(
        back_populates="image", uselist=False, cascade="all, delete-orphan"
    )

class PredictionResult(Base):
    __tablename__ = "prediction_results"

    result_id: Mapped[int] = mapped_column(primary_key=True)

    image_id: Mapped[int] = mapped_column(
        ForeignKey("cervix_images.image_id"), unique=True
    )
    predicted_class: Mapped[str] = mapped_column(String(20))
    confidence_score: Mapped[float] = mapped_column(Float)
    certainty_level: Mapped[str] = mapped_column(String(20))
    explanation: Mapped[str] = mapped_column(Text)
    heatmap_path: Mapped[str] = mapped_column(String(500))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    image: Mapped["CervixImage"] = relationship(back_populates="result")