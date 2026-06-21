import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# Setup path so backend can be imported
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import app
from extensions import db
from models.user import User
from models.analysis_run import AnalysisRun
from models.source_result import SourceResult
from models.incident import Incident
from flask_jwt_extended import create_access_token


class HistoryManagementTests(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["TESTING"] = True
        # Disable JWT token blocklist check for simple tests or keep it as is
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _seed_data(self):
        u1 = User(email="user1@example.com", password_hash="pbkdf2:sha256...", full_name="User One", role="user")
        u2 = User(email="user2@example.com", password_hash="pbkdf2:sha256...", full_name="User Two", role="user")
        db.session.add(u1)
        db.session.add(u2)
        db.session.commit()

        run1 = AnalysisRun(
            user_id=u1.id,
            run_name="original_run_name",
            name="Original Display Name",
            notes="Some notes",
            status="completed",
            auth_file_name="auth.csv",
            api_file_name="api.csv",
            system_file_name="system.csv"
        )
        db.session.add(run1)
        db.session.commit()

        res1 = SourceResult(
            analysis_run_id=run1.id,
            source_type="auth",
            total_records=100,
            anomaly_count=5,
            anomaly_percentage=5.0
        )
        inc1 = Incident(
            run_id=run1.id,
            incident_type="correlated_anomaly",
            severity="HIGH",
            description="High risk incident detected",
            risk_score=85.0,
            risk_level="HIGH",
            incident_summary="summary",
            explanations=[]
        )
        db.session.add(res1)
        db.session.add(inc1)
        db.session.commit()

        return u1, u2, run1

    def test_successful_rename(self):
        u1, _, run1 = self._seed_data()
        token = create_access_token(identity=str(u1.id))
        headers = {"Authorization": f"Bearer {token}"}

        payload = {"name": "New Analysis Name"}
        response = self.client.put(f"/history/{run1.id}/rename", json=payload, headers=headers)
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["message"], "Analysis renamed successfully")
        
        # Verify changes in DB
        db.session.refresh(run1)
        self.assertEqual(run1.name, "New Analysis Name")
        self.assertEqual(run1.run_name, "original_run_name")  # Must preserve original run_name

    def test_rename_empty_name_validation(self):
        u1, _, run1 = self._seed_data()
        token = create_access_token(identity=str(u1.id))
        headers = {"Authorization": f"Bearer {token}"}

        # Test empty string
        response = self.client.put(f"/history/{run1.id}/rename", json={"name": ""}, headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Name is required", response.get_json()["error"])

        # Test whitespace only
        response = self.client.put(f"/history/{run1.id}/rename", json={"name": "   "}, headers=headers)
        self.assertEqual(response.status_code, 400)

        # Test missing key
        response = self.client.put(f"/history/{run1.id}/rename", json={}, headers=headers)
        self.assertEqual(response.status_code, 400)

    def test_rename_ownership_validation(self):
        _, u2, run1 = self._seed_data()
        token = create_access_token(identity=str(u2.id))  # Authenticated as user 2
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to rename run owned by user 1
        response = self.client.put(f"/history/{run1.id}/rename", json={"name": "Stolen Rename"}, headers=headers)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["error"], "Access denied")

        # Verify database was not changed
        db.session.refresh(run1)
        self.assertEqual(run1.name, "Original Display Name")

    def test_successful_deletion_and_cascade(self):
        u1, _, run1 = self._seed_data()
        token = create_access_token(identity=str(u1.id))
        headers = {"Authorization": f"Bearer {token}"}

        # Count objects before deletion
        self.assertEqual(SourceResult.query.filter_by(analysis_run_id=run1.id).count(), 1)
        self.assertEqual(Incident.query.filter_by(run_id=run1.id).count(), 1)

        response = self.client.delete(f"/history/{run1.id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["message"], "Analysis deleted successfully")

        # Verify AnalysisRun is deleted
        deleted_run = AnalysisRun.query.get(run1.id)
        self.assertIsNone(deleted_run)

        # Verify cascade deletion of source results and incident
        self.assertEqual(SourceResult.query.filter_by(analysis_run_id=run1.id).count(), 0)
        self.assertEqual(Incident.query.filter_by(run_id=run1.id).count(), 0)

    def test_delete_ownership_validation(self):
        _, u2, run1 = self._seed_data()
        token = create_access_token(identity=str(u2.id))  # Authenticated as user 2
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to delete run owned by user 1
        response = self.client.delete(f"/history/{run1.id}", headers=headers)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["error"], "Access denied")

        # Verify database still has the run
        self.assertIsNotNone(AnalysisRun.query.get(run1.id))

    def test_delete_transaction_rollback_on_error(self):
        u1, _, run1 = self._seed_data()
        token = create_access_token(identity=str(u1.id))
        headers = {"Authorization": f"Bearer {token}"}

        # Patch db.session.delete to raise an exception to simulate failure
        with patch.object(db.session, "delete", side_effect=Exception("Simulated db error")):
            response = self.client.delete(f"/history/{run1.id}", headers=headers)
            self.assertEqual(response.status_code, 500)

        # Verify that transaction rolled back and run was NOT deleted
        db.session.rollback()  # clear any remaining failed transaction state
        self.assertIsNotNone(AnalysisRun.query.get(run1.id))

    def test_failed_run_in_history(self):
        u1, _, _ = self._seed_data()
        token = create_access_token(identity=str(u1.id))
        headers = {"Authorization": f"Bearer {token}"}

        # Seed a failed run
        run_failed = AnalysisRun(
            user_id=u1.id,
            run_name="failed_run_name",
            name="Failed Display Name",
            notes="Failed run notes",
            status="failed",
            auth_file_name="auth.csv",
            api_file_name="api.csv",
            system_file_name="system.csv"
        )
        db.session.add(run_failed)
        db.session.commit()

        response = self.client.get("/history", headers=headers)
        self.assertEqual(response.status_code, 200)
        history = response.get_json()["history"]
        
        # Check that we have both runs
        self.assertEqual(len(history), 2)
        
        # Find failed run in response
        failed_item = next(item for item in history if item["id"] == run_failed.id)
        self.assertEqual(failed_item["status"], "failed")
        self.assertIsNone(failed_item["risk_score"])
        self.assertIsNone(failed_item["risk_level"])
        self.assertEqual(failed_item["auth_anomalies"], 0)
        self.assertEqual(failed_item["api_anomalies"], 0)
        self.assertEqual(failed_item["system_anomalies"], 0)

    def test_failed_run_rename_and_delete(self):
        u1, _, _ = self._seed_data()
        token = create_access_token(identity=str(u1.id))
        headers = {"Authorization": f"Bearer {token}"}

        # Seed a failed run
        run_failed = AnalysisRun(
            user_id=u1.id,
            run_name="failed_run_name",
            name="Failed Display Name",
            notes="Failed run notes",
            status="failed",
            auth_file_name="auth.csv",
            api_file_name="api.csv",
            system_file_name="system.csv"
        )
        db.session.add(run_failed)
        db.session.commit()

        # Rename failed run
        rename_response = self.client.put(f"/history/{run_failed.id}/rename", json={"name": "Renamed Failed"}, headers=headers)
        self.assertEqual(rename_response.status_code, 200)
        
        db.session.refresh(run_failed)
        self.assertEqual(run_failed.name, "Renamed Failed")

        # Delete failed run
        delete_response = self.client.delete(f"/history/{run_failed.id}", headers=headers)
        self.assertEqual(delete_response.status_code, 200)
        
        self.assertIsNone(AnalysisRun.query.get(run_failed.id))

    def test_analyze_route_persists_failed_run_on_validation_error(self):
        import io
        import tempfile
        u1, _, _ = self._seed_data()
        token = create_access_token(identity=str(u1.id))
        headers = {"Authorization": f"Bearer {token}"}

        with tempfile.TemporaryDirectory() as tmp:
            self.app.config["UPLOAD_FOLDER"] = Path(tmp)
            request_data = {
                "run_name": "Validation Fail Run",
                "auth_file": (io.BytesIO(b"invalid_header\n1\n"), "auth.csv"),
                "api_file": (io.BytesIO(b"invalid_header\n1\n"), "api.csv"),
                "system_file": (io.BytesIO(b"invalid_header\n1\n"), "system.csv"),
            }

            response = self.client.post("/analyze", data=request_data, headers=headers, content_type="multipart/form-data")
            self.assertEqual(response.status_code, 400)

        # Verify that the run is persisted in the database with status = "failed"
        run = AnalysisRun.query.filter_by(run_name="Validation Fail Run").first()
        self.assertIsNotNone(run)
        self.assertEqual(run.status, "failed")


if __name__ == "__main__":
    unittest.main()
