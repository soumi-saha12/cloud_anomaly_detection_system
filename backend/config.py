import os
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
