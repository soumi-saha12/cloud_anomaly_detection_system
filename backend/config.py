import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
