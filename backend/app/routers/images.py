import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_clinician
from app.models import CervixImage, Clinician, PredictionResult
from app.schemas import ImageResult
from app.services import storage
from app.services.analysis import PredictionError, run_analysis
from app.services.images import InvalidImageError, encode_clean, load_image
from app.services.quality import check_quality

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["images"])

MEDIA_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _to_out(image: CervixImage) -> ImageResult:
    result = image.result
    return ImageResult(
        image_id=image.image_id,
        predicted_class=result.predicted_class,
        confidence_score=result.confidence_score,
        certainty_level=result.certainty_level,
        explanation=result.explanation,
        model_status=result.model_status,
        uploaded_at=_as_utc(image.uploaded_at),
        generated_at=_as_utc(result.generated_at),
        mime_type=image.mime_type,
        file_size_bytes=image.file_size_bytes,
    )


def _cleanup(paths: list[str]) -> None:
    for relative in paths:
        try:
            storage.delete(relative)
        except (OSError, ValueError):
            logger.warning("Could not remove a stored file during cleanup")


def _get_owned(db: Session, image_id: int, clinician_id: int) -> CervixImage:
    image = db.scalar(
        select(CervixImage).where(
            CervixImage.image_id == image_id,
            CervixImage.clinician_id == clinician_id,
        )
    )
    if image is None or image.result is None:
        raise HTTPException(404, "Result not found.")
    return image


def _file_response(relative_path: str, media_type: str) -> FileResponse:
    try:
        path = storage.resolve(relative_path)
    except ValueError:
        raise HTTPException(404, "File not found.") from None
    if not path.is_file():
        raise HTTPException(404, "File not found.")
    return FileResponse(
        path,
        media_type=media_type,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.post("", response_model=ImageResult, status_code=201)
def upload_image(
    file: UploadFile = File(...),
    ignore_quality_warning: bool = Form(False),
    db: Session = Depends(get_db),
    current: Clinician = Depends(get_current_clinician),
):
    contents = file.file.read(settings.max_upload_bytes + 1)
    if len(contents) > settings.max_upload_bytes:
        limit = f"{settings.max_upload_bytes / (1024 * 1024):g}"
        raise HTTPException(413, f"This image is too large. Choose an image up to {limit} MB.")

    try:
        image, mime_type = load_image(contents)
    except InvalidImageError as exc:
        raise HTTPException(422, str(exc)) from None

    report = check_quality(image)
    if report.issues and not ignore_quality_warning:
        raise HTTPException(
            422,
            detail={
                "code": "quality_warning",
                "issues": report.issues,
                "message": "This image may be low quality.",
            },
        )

    clean_bytes, extension = encode_clean(image, mime_type)

    saved: list[str] = []
    try:
        image_path = storage.save_bytes("uploads", extension, clean_bytes)
        saved.append(image_path)

        record = CervixImage(
            clinician_id=current.clinician_id,
            file_name=Path(image_path).name,
            file_path=image_path,
            mime_type=mime_type,
            file_size_bytes=len(clean_bytes),
        )
        db.add(record)
        db.flush()

        analysis = run_analysis(storage.resolve(image_path))
        saved.append(analysis.heatmap_path)

        db.add(
            PredictionResult(
                image_id=record.image_id,
                predicted_class=analysis.predicted_class,
                confidence_score=analysis.confidence_score,
                certainty_level=analysis.certainty_level,
                explanation=analysis.explanation,
                heatmap_path=analysis.heatmap_path,
                model_status=analysis.model_status,
            )
        )
        db.commit()
    except PredictionError:
        logger.exception("Analysis failed")
        db.rollback()
        _cleanup(saved)
        raise HTTPException(500, "The analysis could not be completed. Please try again.") from None
    except Exception:
        db.rollback()
        _cleanup(saved)
        raise

    db.refresh(record)
    return _to_out(record)


@router.get("", response_model=list[ImageResult])
def list_images(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current: Clinician = Depends(get_current_clinician),
):
    rows = db.scalars(
        select(CervixImage)
        .where(
            CervixImage.clinician_id == current.clinician_id,
            CervixImage.result.has(),
        )
        .options(selectinload(CervixImage.result))
        .order_by(CervixImage.image_id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return [_to_out(row) for row in rows]


@router.get("/{image_id}", response_model=ImageResult)
def get_result(
    image_id: int,
    db: Session = Depends(get_db),
    current: Clinician = Depends(get_current_clinician),
):
    return _to_out(_get_owned(db, image_id, current.clinician_id))


@router.get("/{image_id}/file")
def get_image_file(
    image_id: int,
    db: Session = Depends(get_db),
    current: Clinician = Depends(get_current_clinician),
):
    image = _get_owned(db, image_id, current.clinician_id)
    return _file_response(image.file_path, image.mime_type)


@router.get("/{image_id}/heatmap")
def get_heatmap_file(
    image_id: int,
    db: Session = Depends(get_db),
    current: Clinician = Depends(get_current_clinician),
):
    image = _get_owned(db, image_id, current.clinician_id)
    suffix = Path(image.result.heatmap_path).suffix.lower()
    return _file_response(image.result.heatmap_path, MEDIA_TYPES.get(suffix, "image/jpeg"))