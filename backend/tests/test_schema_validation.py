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
    validate_analysis_datasets,
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

    def test_validate_csv_dataset_nan_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            # Create a dataframe with NaNs in API required columns
            dataframe = pd.DataFrame(
                [
                    {
                        "request_count": 10,
                        "unique_events": 5,
                        "unique_services": None,  # NaN
                        "error_count": 1,
                        "unique_users": 2,
                        "unique_regions": 1,
                        "unique_agents": 4,
                        "error_rate": 0.12,
                    }
                ]
            )
            csv_path = self.write_csv(tmpdir, "nan_dataset.csv", dataframe)

            # By default (raise_on_nan=True), it should raise SchemaValidationError
            with self.assertRaises(SchemaValidationError) as ctx:
                validate_csv_dataset(csv_path, API_REQUIRED_COLUMNS, source_type="api")
            
            self.assertEqual(ctx.exception.message, "Dataset contains missing values.")
            self.assertEqual(ctx.exception.details, {"missing_values": 1})

            # With raise_on_nan=False, it should pass without raising
            validated = validate_csv_dataset(csv_path, API_REQUIRED_COLUMNS, source_type="api", raise_on_nan=False)
            self.assertEqual(list(validated.columns), API_REQUIRED_COLUMNS)
            self.assertTrue(validated["unique_services"].isna().any())

    def test_validate_analysis_datasets_collects_all_nans(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            
            # Auth dataset with NaNs
            auth_df = pd.DataFrame([{"failed_attempts": None if i == 0 else 0, "session_duration": 10, "password_age_days": 5, "privilege_level": 1, "threat_level": 1, "hour": 12, "day_of_week": 1, "month": 1, "is_failed_login": 0, "mfa_disabled": 0, "token_expired_flag": 0, "blocked_flag": 0, "suspicious_flag": 0, "is_weekend": 0, "late_night_login": 0} for i in range(2)])
            # API dataset with NaNs
            api_df = pd.DataFrame([{"request_count": None, "unique_events": 5, "unique_services": 3, "error_count": 1, "unique_users": 2, "unique_regions": 1, "unique_agents": 4, "error_rate": 0.12}])
            # System dataset without NaNs
            system_df = pd.DataFrame([{"avg_cpu": 1, "avg_memory": 2, "max_cpu": 3, "max_memory": 4, "sample_cpu": 5, "assigned_memory": 6, "page_cache_memory": 7, "cycles_per_instruction": 8, "memory_accesses_per_instruction": 9, "vertical_scaling": 10, "scheduler": 11, "priority": 12, "scheduling_class": 13, "failed": 14}])
            
            auth_path = self.write_csv(tmpdir, "auth_nan.csv", auth_df)
            api_path = self.write_csv(tmpdir, "api_nan.csv", api_df)
            system_path = self.write_csv(tmpdir, "system_clean.csv", system_df)
            
            saved_paths = {
                "auth": str(auth_path),
                "api": str(api_path),
                "system": str(system_path),
            }
            uploaded_filenames = {
                "auth": "auth_nan.csv",
                "api": "api_nan.csv",
                "system": "system_clean.csv",
            }
            
            with self.assertRaises(SchemaValidationError) as ctx:
                validate_analysis_datasets(saved_paths, uploaded_filenames)
                
            self.assertEqual(ctx.exception.message, "Dataset contains missing values.")
            self.assertEqual(ctx.exception.details, {
                "auth_nan.csv": {"missing_values": 1},
                "api_nan.csv": {"missing_values": 1},
            })

    def test_analyze_route_returns_400_for_missing_values_validation_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            app.config["UPLOAD_FOLDER"] = tmpdir

            request_data = {
                "run_name": "Missing values check",
                "auth_file": (
                    io.BytesIO(
                        b"failed_attempts,session_duration,password_age_days,privilege_level,threat_level,hour,day_of_week,month,is_failed_login,mfa_disabled,token_expired_flag,blocked_flag,suspicious_flag,is_weekend,late_night_login\n,2,3,4,5,6,7,8,9,10,11,12,13,14,15\n"
                    ),
                    "auth.csv",
                ),
                "api_file": (
                    io.BytesIO(
                        b"request_count,unique_events,unique_services,error_count,unique_users,unique_regions,unique_agents,error_rate\n,2,3,4,5,6,7,0.12\n"
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
                with patch.object(analysis_routes, "get_jwt_identity", return_value="1"), patch.object(analysis_routes.db, "session", MagicMock()):
                    response, status_code = analysis_routes.analyze.__wrapped__()

            payload = response.get_json()

            self.assertEqual(status_code, 400)
            self.assertEqual(payload["success"], False)
            self.assertEqual(payload["error_type"], "SCHEMA_VALIDATION")
            self.assertEqual(payload["message"], "Dataset contains missing values.")
            self.assertEqual(payload["details"], {
                "auth.csv": {"missing_values": 1},
                "api.csv": {"missing_values": 1},
            })


if __name__ == "__main__":
    unittest.main()
