import pandas as pd

from services.model_loader import get_model


def _predict_with_models(csv_path, model_prefix, required_columns, use_scaler=False):
    data = pd.read_csv(csv_path)

    isolation_forest = get_model(f"{model_prefix}_if")
    local_outlier_factor = get_model(f"{model_prefix}_lof")

    if isolation_forest is None or local_outlier_factor is None:
        raise ValueError(f"Missing models for {model_prefix}")

    features = data[required_columns]

    if use_scaler:
        scaler = get_model(f"{model_prefix}_scaler")
        if scaler is None:
            raise ValueError(f"Missing scaler for {model_prefix}")
        features = pd.DataFrame(scaler.transform(features), columns=features.columns)

    if_predictions = isolation_forest.predict(features)
    lof_predictions = local_outlier_factor.predict(features)

    anomaly_mask = (if_predictions == -1) | (lof_predictions == -1)
    anomaly_count = int(anomaly_mask.sum())

    return {
        "total": int(len(data)),
        "anomalies": anomaly_count,
    }


def predict_auth(csv_path):
    required_cols = [
        'failed_attempts', 'session_duration', 'password_age_days',
        'privilege_level', 'threat_level', 'hour', 'day_of_week',
        'month', 'is_failed_login', 'mfa_disabled', 'token_expired_flag',
        'blocked_flag', 'suspicious_flag', 'is_weekend', 'late_night_login'
    ]
    return _predict_with_models(csv_path, "auth", required_cols, use_scaler=True)


def predict_api(csv_path):
    required_cols = [
        'request_count', 'unique_events', 'unique_services', 'error_count',
        'unique_users', 'unique_regions', 'unique_agents', 'error_rate'
    ]
    return _predict_with_models(csv_path, "api", required_cols)


def predict_system(csv_path):
    required_cols = [
        'avg_cpu', 'avg_memory', 'max_cpu', 'max_memory', 'sample_cpu',
        'assigned_memory', 'page_cache_memory', 'cycles_per_instruction',
        'memory_accesses_per_instruction', 'vertical_scaling', 'scheduler',
        'priority', 'scheduling_class', 'failed'
    ]
    return _predict_with_models(csv_path, "system", required_cols)
