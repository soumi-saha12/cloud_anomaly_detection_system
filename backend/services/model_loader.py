import joblib

from config import Config


MODELS = {
    name: joblib.load(path)
    for name, path in Config.MODEL_PATHS.items()
}


def get_model(name):
    return MODELS.get(name)
