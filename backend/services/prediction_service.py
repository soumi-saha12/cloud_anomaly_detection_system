import logging
import pandas as pd

from services.model_loader import get_model
from services.schema_validation import get_required_columns, validate_csv_dataset

logger = logging.getLogger(__name__)


def _predict_with_models(csv_path, model_prefix, required_columns, use_scaler=False):
    data = validate_csv_dataset(
        csv_path,
        required_columns,
        source_type=model_prefix,
    )

    isolation_forest = get_model(f"{model_prefix}_if")
    local_outlier_factor = get_model(f"{model_prefix}_lof")

    if isolation_forest is None or local_outlier_factor is None:
        raise ValueError(f"Missing models for {model_prefix}")

    features = data

    if use_scaler:
        scaler = get_model(f"{model_prefix}_scaler")
        if scaler is None:
            raise ValueError(f"Missing scaler for {model_prefix}")
        features = pd.DataFrame(scaler.transform(features), columns=features.columns)

    logger.info(
        "Predicting anomalies for %s; file=%s shape=%s columns=%s",
        model_prefix,
        csv_path,
        features.shape,
        list(features.columns),
    )
    logger.info(
        "First few rows of %s features:\n%s",
        model_prefix,
        features.head(3).to_dict(orient="records"),
    )

    if_predictions = isolation_forest.predict(features)
    lof_predictions = local_outlier_factor.predict(features)

    anomaly_mask = (if_predictions == -1) | (lof_predictions == -1)
    anomaly_count = int(anomaly_mask.sum())

    if_anomaly_count = int((if_predictions == -1).sum())
    lof_anomaly_count = int((lof_predictions == -1).sum())

    logger.info(
        "Prediction completed for %s; Isolation Forest anomaly count=%d, LOF anomaly count=%d, Final ensemble anomaly count=%d",
        model_prefix,
        if_anomaly_count,
        lof_anomaly_count,
        anomaly_count,
    )

    return {
        "total": int(len(data)),
        "anomalies": anomaly_count,
    }


def predict_auth(csv_path):
    return _predict_with_models(csv_path, "auth", get_required_columns("auth"), use_scaler=False)


def predict_api(csv_path):
    return _predict_with_models(csv_path, "api", get_required_columns("api"))


def predict_system(csv_path):
    return _predict_with_models(csv_path, "system", get_required_columns("system"))
