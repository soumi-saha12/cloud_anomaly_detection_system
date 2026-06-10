import os
from datetime import timedelta
from pathlib import Path


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    BASE_DIR = Path(__file__).resolve().parent
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    MODEL_PATHS = {
        "api_if": BASE_DIR.parent / "models" / "API" / "api_if.pkl",
        "api_lof": BASE_DIR.parent / "models" / "API" / "api_lof.pkl",
        "auth_if": BASE_DIR.parent / "models" / "auth" / "auth_if.pkl",
        "auth_lof": BASE_DIR.parent / "models" / "auth" / "auth_lof.pkl",
        "auth_scaler": BASE_DIR.parent / "models" / "auth" / "auth_scaler.pkl",
        "system_if": BASE_DIR.parent / "models" / "system" / "system_if.pkl",
        "system_lof": BASE_DIR.parent / "models" / "system" / "system_lof.pkl",
    }

    # Database settings
    db_url = os.getenv("DATABASE_URL", "sqlite:///dev.db")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # CORS settings
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
