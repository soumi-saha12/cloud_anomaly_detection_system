import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import app
from routes import analysis_routes
from services.schema_validation import (
    SchemaValidationError,
    get_required_columns,
    get_schema_definitions,
    validate_csv_dataset,
)


AUTH_REQUIRED_COLUMNS = get_required_columns("auth")
API_REQUIRED_COLUMNS = get_required_columns("api")
SYSTEM_REQUIRED_COLUMNS = get_required_columns("system")


class SchemaValidationTests(unittest.TestCase):
    def write_csv(self, directory: Path, filename: str, dataframe: pd.DataFrame) -> Path:
        path = directory / filename
        dataframe.to_csv(path, index=False)
        return path

    def test_validate_csv_dataset_accepts_valid_schema_with_extra_columns_and_wrong_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            dataframe = pd.DataFrame(
                [
                    {
                        "extra_b": 99,
                        "unique_services": 3,
                        "request_count": 10,
                        "error_rate": 0.12,
                        "unique_events": 5,
                        "extra_a": 42,
                        "error_count": 1,
                        "unique_users": 2,
                        "unique_regions": 1,
                        "unique_agents": 4,
                    }
                ]
            )
            csv_path = self.write_csv(tmpdir, "valid.csv", dataframe)

            validated = validate_csv_dataset(csv_path, API_REQUIRED_COLUMNS, source_type="api")

            self.assertEqual(list(validated.columns), API_REQUIRED_COLUMNS)
            self.assertEqual(validated.iloc[0]["request_count"], 10)
            self.assertEqual(validated.iloc[0]["error_rate"], 0.12)

    def test_schema_definitions_match_required_columns(self):
        schema_definitions = get_schema_definitions()

        self.assertEqual(schema_definitions["auth"]["required_columns"], AUTH_REQUIRED_COLUMNS)
        self.assertEqual(schema_definitions["api"]["required_columns"], API_REQUIRED_COLUMNS)
        self.assertEqual(schema_definitions["system"]["required_columns"], SYSTEM_REQUIRED_COLUMNS)

    def test_validate_csv_dataset_raises_for_missing_columns(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            dataframe = pd.DataFrame(
                [
                    {
                        "request_count": 10,
                        "unique_events": 5,
                        "error_count": 1,
                        "unique_users": 2,
                        "unique_regions": 1,
                        "unique_agents": 4,
                    }
                ]
            )
            csv_path = self.write_csv(tmpdir, "missing.csv", dataframe)

            with self.assertRaises(SchemaValidationError) as ctx:
                validate_csv_dataset(csv_path, API_REQUIRED_COLUMNS, source_type="api")

            self.assertEqual(ctx.exception.message, "Missing required columns")
            self.assertEqual(ctx.exception.missing_columns, ["unique_services", "error_rate"])

    def test_validate_csv_dataset_raises_for_empty_csv(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            csv_path = tmpdir / "empty.csv"
            csv_path.write_text("")

            with self.assertRaises(SchemaValidationError) as ctx:
                validate_csv_dataset(csv_path, API_REQUIRED_COLUMNS, source_type="api")

            self.assertEqual(ctx.exception.message, "Empty dataset")

    def test_validate_csv_dataset_raises_for_duplicate_columns(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            csv_path = tmpdir / "duplicate.csv"
            csv_path.write_text(
                "request_count,request_count,unique_events,unique_services,error_count,unique_users,unique_regions,unique_agents,error_rate\n"
                "1,2,3,4,5,6,7,8,0.1\n"
            )

            with self.assertRaises(SchemaValidationError) as ctx:
                validate_csv_dataset(csv_path, API_REQUIRED_COLUMNS, source_type="api")

            self.assertEqual(ctx.exception.message, "Duplicate column names")
            self.assertEqual(ctx.exception.duplicate_columns, ["request_count"])

    def test_analyze_route_returns_400_for_schema_validation_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            app.config["UPLOAD_FOLDER"] = tmpdir

            request_data = {
                "run_name": "Schema check",
                "auth_file": (
                    io.BytesIO(
                        b"failed_attempts,session_duration,password_age_days,privilege_level,threat_level,hour,day_of_week,month,is_failed_login,mfa_disabled,token_expired_flag,blocked_flag,suspicious_flag,is_weekend,late_night_login\n1,2,3,4,5,6,7,8,9,10,11,12,13,14,15\n"
                    ),
                    "auth.csv",
                ),
                "api_file": (
                    io.BytesIO(
                        b"request_count,unique_events,error_count,unique_users,unique_regions,unique_agents\n1,2,3,4,5,6\n"
                    ),
                    "api.csv",
                ),
                "system_file": (
                    io.BytesIO(
                        b"avg_cpu,avg_memory,max_cpu,max_memory,sample_cpu,assigned_memory,page_cache_memory,cycles_per_instruction,memory_accesses_per_instruction,vertical_scaling,scheduler,priority,scheduling_class,failed\n1,2,3,4,5,6,7,8,9,10,11,12,13,14\n"
                    ),
                    "system.csv",
                ),
            }

            with app.test_request_context(
                "/analyze",
                method="POST",
                data=request_data,
                content_type="multipart/form-data",
            ):
                with patch.object(analysis_routes, "get_jwt_identity", return_value="1"), patch.object(
                    analysis_routes, "predict_auth", side_effect=SchemaValidationError(
                        "Missing required columns",
                        source_type="auth",
                        missing_columns=["request_count", "error_rate"],
                    ),
                ), patch.object(analysis_routes, "predict_api"), patch.object(
                    analysis_routes, "predict_system"
                ), patch.object(analysis_routes.db, "session", MagicMock()):
                    response, status_code = analysis_routes.analyze.__wrapped__()

            payload = response.get_json()

            self.assertEqual(status_code, 400)
            self.assertEqual(payload["success"], False)
            self.assertEqual(payload["error_type"], "SCHEMA_VALIDATION")
            self.assertEqual(payload["source_type"], "api")
            self.assertEqual(payload["missing_columns"], ["unique_services", "error_rate"])

    def test_schema_endpoint_returns_the_shared_definitions(self):
        with app.test_request_context("/schema", method="GET"):
            response = analysis_routes.get_schema.__wrapped__()

        payload = response.get_json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["datasets"]["auth"]["required_columns"], AUTH_REQUIRED_COLUMNS)
        self.assertEqual(payload["datasets"]["api"]["required_columns"], API_REQUIRED_COLUMNS)
        self.assertEqual(payload["datasets"]["system"]["required_columns"], SYSTEM_REQUIRED_COLUMNS)


if __name__ == "__main__":
    unittest.main()
