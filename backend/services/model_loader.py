from pathlib import Path

import joblib


BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BASE_DIR / "models"

MODEL_PATHS = {
    "api_if": MODELS_DIR / "API" / "api_if.pkl",
    "api_lof": MODELS_DIR / "API" / "api_lof.pkl",
    "auth_if": MODELS_DIR / "auth" / "auth_if.pkl",
    "auth_lof": MODELS_DIR / "auth" / "auth_lof.pkl",
    "auth_scaler": MODELS_DIR / "auth" / "auth_scaler.pkl",
    "system_if": MODELS_DIR / "system" / "system_if.pkl",
    "system_lof": MODELS_DIR / "system" / "system_lof.pkl",
}


MODELS = {
    name: joblib.load(path)
    for name, path in MODEL_PATHS.items()
}


def get_model(name):
    return MODELS.get(name)
