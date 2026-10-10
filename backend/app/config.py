from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    secret_key: str

    database_url: str = "sqlite:///./app.db"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60

    max_upload_bytes: int = 5 * 1024 * 1024  # 5 MB
    allowed_mime_types: tuple = ("image/jpeg", "image/png")

    certainty_high: float = 0.85
    certainty_medium: float = 0.65


settings = Settings()