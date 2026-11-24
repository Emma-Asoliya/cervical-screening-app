from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    secret_key: str

    @field_validator("secret_key")
    @classmethod
    def secret_key_is_long_enough(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return value

    database_url: str = "sqlite:///./app.db"
    # Hosted Postgres. When postgres_host is set (and DATABASE_URL is not
    # overridden) the app uses it instead of the local SQLite file.
    postgres_host: str = ""
    postgres_port: int = 5432
    postgres_user: str = ""
    postgres_password: str = ""
    postgres_database_name: str = ""

    # Cloudinary file storage. When cloudinary_cloud_name is empty, files
    # stay on the local disk (used by tests and local development).
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "UPLOADS"
    jwt_algorithm: str = "HS256"
    cors_origins: list[str] = ["https://cervical-screening-frontend.vercel.app"]
    access_token_minutes: int = 60

    max_upload_bytes: int = 5 * 1024 * 1024  # 5 MB
    min_image_side: int = 224
    max_image_pixels: int = 25_000_000

    blur_threshold: float = 100.0
    brightness_min: float = 50.0
    brightness_max: float = 205.0

    certainty_high: float = 0.85
    certainty_medium: float = 0.65

    # The model was trained on 640x480 after-acid photos (the timestamp mask
    # in the notebook assumes this exact size), so other sizes are refused.
    required_image_width: int = 640
    required_image_height: int = 480

    # Folder holding fold0.keras ... fold4.keras and config.json from the notebook.
    model_dir: Path = Path(__file__).resolve().parent / "ml_models"

    
    require_email_verification: bool = True
    verification_code_minutes: int = 15
    verification_max_attempts: int = 5
    verification_resend_seconds: int = 60
    frontend_url: str = "http://localhost:5173"
    # Brevo HTTP API (used when brevo_api_key is set; works on hosts that block SMTP).
    brevo_api_key: str = ""
    brevo_sender_email: str = ""
    brevo_sender_name: str = "Cervical Screening Support"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    
settings = Settings()