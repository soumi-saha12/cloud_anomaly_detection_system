import pandas as pd

from services.model_loader import get_model


def _predict_with_models(csv_path, model_prefix, use_scaler=False):
    data = pd.read_csv(csv_path)

    isolation_forest = get_model(f"{model_prefix}_if")
    local_outlier_factor = get_model(f"{model_prefix}_lof")

    if isolation_forest is None or local_outlier_factor is None:
        raise ValueError(f"Missing models for {model_prefix}")

    features = data

    if use_scaler:
        scaler = get_model(f"{model_prefix}_scaler")
        if scaler is None:
            raise ValueError(f"Missing scaler for {model_prefix}")
        features = pd.DataFrame(scaler.transform(data), columns=data.columns)

    if_predictions = isolation_forest.predict(features)
    lof_predictions = local_outlier_factor.predict(features)

    anomaly_mask = (if_predictions == -1) | (lof_predictions == -1)
    anomaly_count = int(anomaly_mask.sum())

    return {
        "total": int(len(data)),
        "anomalies": anomaly_count,
    }


def predict_auth(csv_path):
    return _predict_with_models(csv_path, "auth", use_scaler=True)


def predict_api(csv_path):
    return _predict_with_models(csv_path, "api")


def predict_system(csv_path):
    return _predict_with_models(csv_path, "system")
