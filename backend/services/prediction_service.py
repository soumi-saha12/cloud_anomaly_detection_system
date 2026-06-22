import logging
import time
from pathlib import Path

import pandas as pd

from services.model_loader import get_model
from services.schema_validation import get_required_columns, validate_csv_dataset

logger = logging.getLogger(__name__)


def _load_prediction_data(data_source, model_prefix, required_columns):
    if isinstance(data_source, pd.DataFrame):
        started_at = time.perf_counter()
        data = data_source.loc[:, required_columns].copy()
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "%s dataset reused from validation; rows=%d cols=%d preprocess_ms=%.2f",
            model_prefix,
            len(data),
            len(data.columns),
            elapsed_ms,
        )
        return data

    if isinstance(data_source, (str, Path)):
        return validate_csv_dataset(
            data_source,
            required_columns,
            source_type=model_prefix,
        )

    raise TypeError(f"Unsupported data source for {model_prefix}: {type(data_source)!r}")


def _predict_with_models(data_source, model_prefix, required_columns, use_scaler=False):
    data = _load_prediction_data(data_source, model_prefix, required_columns)
    timings = {}
    total_started_at = time.perf_counter()
    isolation_forest = get_model(f"{model_prefix}_if")
    local_outlier_factor = get_model(f"{model_prefix}_lof")

    if isolation_forest is None or local_outlier_factor is None:
        raise ValueError(f"Missing models for {model_prefix}")

    features = data

    if use_scaler:
        scaler_started_at = time.perf_counter()
        scaler = get_model(f"{model_prefix}_scaler")
        if scaler is None:
            raise ValueError(f"Missing scaler for {model_prefix}")
        features = pd.DataFrame(scaler.transform(features), columns=features.columns)
        timings["scaler_ms"] = (time.perf_counter() - scaler_started_at) * 1000

    logger.info(
        "Predicting anomalies for %s; shape=%s columns=%s",
        model_prefix,
        features.shape,
        list(features.columns),
    )

    if_started_at = time.perf_counter()
    if_predictions = isolation_forest.predict(features)
    timings["if_predict_ms"] = (time.perf_counter() - if_started_at) * 1000

    lof_started_at = time.perf_counter()
    lof_predictions = local_outlier_factor.predict(features)
    timings["lof_predict_ms"] = (time.perf_counter() - lof_started_at) * 1000

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

    timings["total_ms"] = (time.perf_counter() - total_started_at) * 1000
    logger.info(
        "%s prediction timings; %s",
        model_prefix,
        ", ".join(f"{name}={value:.2f}ms" for name, value in timings.items()),
    )

    return {
        "total": int(len(data)),
        "anomalies": anomaly_count,
        "timings_ms": timings,
    }


def predict_auth(data_source):
    return _predict_with_models(data_source, "auth", get_required_columns("auth"), use_scaler=False)


def predict_api(data_source):
    return _predict_with_models(data_source, "api", get_required_columns("api"))


def predict_system(data_source):
    return _predict_with_models(data_source, "system", get_required_columns("system"))
