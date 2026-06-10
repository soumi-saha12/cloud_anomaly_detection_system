from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from extensions import db
from models.analysis_run import AnalysisRun
from models.source_result import SourceResult
from models.incident import Incident

from services.prediction_service import (
    predict_api,
    predict_auth,
    predict_system,
)
from services.correlation_engine import generate_incident

analysis_bp = Blueprint("analysis", __name__)


def _calculate_percentage(total, anomalies):
    return round((anomalies / total) * 100, 2) if total > 0 else 0.0


def _get_uploaded_files() -> dict[str, FileStorage]:
    auth_file = request.files.get("auth_file")
    api_file = request.files.get("api_file")
    system_file = request.files.get("system_file")

    if auth_file is None or api_file is None or system_file is None:
        abort(400)

    return {
        "auth": auth_file,
        "api": api_file,
        "system": system_file,
    }


@analysis_bp.post("/analyze")
@jwt_required()
def analyze():
    user_id = get_jwt_identity()
    run_name = request.form.get("run_name")
    uploaded_files = _get_uploaded_files()

    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    upload_folder.mkdir(parents=True, exist_ok=True)

    saved_paths = {}
    for source_name, file_storage in uploaded_files.items():
        filename = secure_filename(file_storage.filename or f"{source_name}.csv")
        file_path = upload_folder / f"{source_name}_{filename}"
        file_storage.save(file_path)
        saved_paths[source_name] = str(file_path)

    # Create and commit the initial AnalysisRun record
    run = AnalysisRun(
        user_id=int(user_id),
        run_name=run_name.strip() if run_name else None,
        status="processing",
        auth_file_name=uploaded_files["auth"].filename or "auth.csv",
        api_file_name=uploaded_files["api"].filename or "api.csv",
        system_file_name=uploaded_files["system"].filename or "system.csv"
    )
    db.session.add(run)
    db.session.commit()

    try:
        auth_result = predict_auth(saved_paths["auth"])
        api_result = predict_api(saved_paths["api"])
        system_result = predict_system(saved_paths["system"])

        # Save source results
        sources = [
            ("auth", auth_result),
            ("api", api_result),
            ("system", system_result)
        ]
        for src_type, res in sources:
            pct = _calculate_percentage(res["total"], res["anomalies"])
            src_res = SourceResult(
                analysis_run_id=run.id,
                source_type=src_type,
                total_records=res["total"],
                anomaly_count=res["anomalies"],
                anomaly_percentage=pct
            )
            db.session.add(src_res)

        # Generate correlated incident
        incident_data = generate_incident(
            auth_total=auth_result["total"],
            auth_anomalies=auth_result["anomalies"],
            api_total=api_result["total"],
            api_anomalies=api_result["anomalies"],
            system_total=system_result["total"],
            system_anomalies=system_result["anomalies"],
        )

        # Save Incident record
        inc = Incident(
            analysis_run_id=run.id,
            risk_score=incident_data["risk_score"],
            risk_level=incident_data["risk_level"],
            incident_summary=incident_data["incident_summary"],
            explanations=incident_data["explanations"]
        )
        db.session.add(inc)

        # Complete run
        run.status = "completed"
        db.session.commit()

        # Return response with run_id
        incident_data["run_id"] = run.id
        return jsonify(incident_data)

    except Exception as e:
        db.session.rollback()
        try:
            run.status = "failed"
            db.session.commit()
        except Exception:
            pass
        raise e
