import csv
import logging
from pathlib import Path
from typing import Iterable

import pandas as pd

logger = logging.getLogger(__name__)


DATASET_SCHEMAS = {
    "auth": {
        "label": "Authentication Dataset",
        "required_columns": [
            "failed_attempts",
            "session_duration",
            "password_age_days",
            "privilege_level",
            "threat_level",
            "hour",
            "day_of_week",
            "month",
            "is_failed_login",
            "mfa_disabled",
            "token_expired_flag",
            "blocked_flag",
            "suspicious_flag",
            "is_weekend",
            "late_night_login",
        ],
    },
    "api": {
        "label": "API Dataset",
        "required_columns": [
            "request_count",
            "unique_events",
            "unique_services",
            "error_count",
            "unique_users",
            "unique_regions",
            "unique_agents",
            "error_rate",
        ],
    },
    "system": {
        "label": "System Dataset",
        "required_columns": [
            "avg_cpu",
            "avg_memory",
            "max_cpu",
            "max_memory",
            "sample_cpu",
            "assigned_memory",
            "page_cache_memory",
            "cycles_per_instruction",
            "memory_accesses_per_instruction",
            "vertical_scaling",
            "scheduler",
            "priority",
            "scheduling_class",
            "failed",
        ],
    },
}


def get_required_columns(source_type: str) -> list[str]:
    try:
        return DATASET_SCHEMAS[source_type]["required_columns"]
    except KeyError as exc:
        raise KeyError(f"Unknown dataset source: {source_type}") from exc


def get_schema_definitions() -> dict[str, dict[str, list[str] | str]]:
    return {
        source_type: {
            "label": schema["label"],
            "required_columns": list(schema["required_columns"]),
        }
        for source_type, schema in DATASET_SCHEMAS.items()
    }


class SchemaValidationError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        source_type: str | None = None,
        missing_columns: list[str] | None = None,
        duplicate_columns: list[str] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.source_type = source_type
        self.missing_columns = missing_columns or []
        self.duplicate_columns = duplicate_columns or []

    def to_response(self) -> dict:
        payload = {
            "success": False,
            "error_type": "SCHEMA_VALIDATION",
            "message": self.message,
        }

        if self.source_type:
            payload["source_type"] = self.source_type

        if self.missing_columns:
            payload["missing_columns"] = self.missing_columns

        if self.duplicate_columns:
            payload["duplicate_columns"] = self.duplicate_columns

        return payload


def _read_csv_header(csv_path: str | Path) -> list[str]:
    try:
        with open(csv_path, "r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.reader(handle)
            header = next(reader, None)
    except (OSError, UnicodeDecodeError) as exc:
        raise SchemaValidationError("Invalid file structure") from exc

    if not header or all(column.strip() == "" for column in header):
        raise SchemaValidationError("Empty dataset")

    return header


def _find_duplicate_columns(columns: Iterable[str]) -> list[str]:
    seen = set()
    duplicates = []

    for column in columns:
        if column in seen and column not in duplicates:
            duplicates.append(column)
        seen.add(column)

    return duplicates


def validate_csv_dataset(
    csv_path: str | Path,
    required_columns: list[str],
    *,
    source_type: str,
) -> pd.DataFrame:
    header = _read_csv_header(csv_path)
    duplicate_columns = _find_duplicate_columns(header)

    logger.info(
        "Validating %s dataset schema; uploaded columns=%s",
        source_type,
        header,
    )

    if duplicate_columns:
        logger.warning(
            "%s dataset schema validation failed; duplicate columns=%s",
            source_type,
            duplicate_columns,
        )
        raise SchemaValidationError(
            "Duplicate column names",
            source_type=source_type,
            duplicate_columns=duplicate_columns,
        )

    try:
        data = pd.read_csv(csv_path)
    except pd.errors.EmptyDataError as exc:
        logger.warning("%s dataset schema validation failed; dataset is empty", source_type)
        raise SchemaValidationError("Empty dataset", source_type=source_type) from exc
    except (pd.errors.ParserError, ValueError, UnicodeDecodeError) as exc:
        logger.warning(
            "%s dataset schema validation failed; file structure is invalid",
            source_type,
        )
        raise SchemaValidationError("Invalid file structure", source_type=source_type) from exc

    if data.empty:
        logger.warning("%s dataset schema validation failed; dataset is empty", source_type)
        raise SchemaValidationError("Empty dataset", source_type=source_type)

    missing_columns = [column for column in required_columns if column not in data.columns]

    if missing_columns:
        logger.warning(
            "%s dataset schema validation failed; missing columns=%s",
            source_type,
            missing_columns,
        )
        raise SchemaValidationError(
            "Missing required columns",
            source_type=source_type,
            missing_columns=missing_columns,
        )

    logger.info(
        "%s dataset schema validation passed; validation columns=%s",
        source_type,
        list(data.columns),
    )

    return data.loc[:, required_columns].copy()
