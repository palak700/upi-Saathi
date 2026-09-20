"""Application configuration loaded from environment variables.

Prefix every variable with ``UPI_`` (for example ``UPI_DATABASE_URL``).
Defaults keep the whole stack runnable locally against PostgreSQL, and allow
a zero-config SQLite fallback for quick bootstrapping during development.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="UPI_", extra="ignore")

    app_name: str = "UPI Saathi"
    api_prefix: str = "/api"
    environment: str = "development"

    # Security
    secret_key: str = "upi-saathi-local-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    refresh_token_expire_days: int = 30

    # Database. Default targets PostgreSQL; set UPI_DATABASE_URL=sqlite:///./upi_saathi.db
    # for a quick local, file-based run (used for smoke tests too).
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/upi_saathi"
    auto_create_tables: bool = True

    # CORS
    cors_origins: str = "*"

    # RAG knowledge base
    chroma_dir: str = "./chroma_store"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    rag_top_k: int = 4

    # QR guardian thresholds
    high_amount_threshold: float = 10000.0

    # Voice
    whisper_model_size: str = "tiny"
    tts_provider: str = "gtts"  # "gtts" | "engine"

    # Vision
    ocr_enabled: bool = True

    # Delivery providers (leave unset to run in preview mode)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
