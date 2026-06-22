import logging
import time
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
from services.schema_validation import (
    SchemaValidationError,
    get_schema_definitions,
    validate_analysis_datasets,
)
from services.correlation_engine import generate_incident

analysis_bp = Blueprint("analysis", __name__)
logger = logging.getLogger(__name__)


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


def _log_uploaded_file(source_name: str, file_storage: FileStorage) -> None:
    file_type = Path(file_storage.filename or "").suffix.lower() or "unknown"
    logger.info(
        "Received %s upload; filename=%s content_type=%s file_type=%s",
        source_name,
        file_storage.filename or "",
        file_storage.content_type or "",
        file_type,
    )


def _log_timing(stage: str, started_at: float) -> None:
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    logger.info("Analysis timing; stage=%s elapsed_ms=%.2f", stage, elapsed_ms)


@analysis_bp.get("/schema")
@jwt_required()
def get_schema():
    return jsonify({
        "success": True,
        "datasets": get_schema_definitions(),
    })


@analysis_bp.post("/analyze")
@jwt_required()
def analyze():
    request_started_at = time.perf_counter()
    user_id = get_jwt_identity()
    run_name = request.form.get("run_name")
    uploaded_files = _get_uploaded_files()

    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    upload_folder.mkdir(parents=True, exist_ok=True)

    saved_paths = {}
    for source_name, file_storage in uploaded_files.items():
        _log_uploaded_file(source_name, file_storage)
        filename = secure_filename(file_storage.filename or f"{source_name}.csv")
        file_path = upload_folder / f"{source_name}_{filename}"
        file_storage.save(file_path)
        saved_paths[source_name] = str(file_path)
    _log_timing("csv_upload_save", request_started_at)

    # Create and commit the initial AnalysisRun record
    db_write_started_at = time.perf_counter()
    run = AnalysisRun(
        user_id=int(user_id),
        run_name=run_name.strip() if run_name else None,
        name=run_name.strip() if run_name else None,
        status="processing",
        auth_file_name=uploaded_files["auth"].filename or "auth.csv",
        api_file_name=uploaded_files["api"].filename or "api.csv",
        system_file_name=uploaded_files["system"].filename or "system.csv"
    )
    db.session.add(run)
    db.session.commit()
    _log_timing("initial_run_db_write", db_write_started_at)

    try:
        validation_started_at = time.perf_counter()
        uploaded_filenames = {
            "auth": uploaded_files["auth"].filename or "auth.csv",
            "api": uploaded_files["api"].filename or "api.csv",
            "system": uploaded_files["system"].filename or "system.csv",
        }
        validated_datasets = validate_analysis_datasets(saved_paths, uploaded_filenames)
        _log_timing("validation", validation_started_at)

        auth_predict_started_at = time.perf_counter()
        auth_result = predict_auth(validated_datasets["auth"])
        _log_timing("auth_model_prediction", auth_predict_started_at)

        api_predict_started_at = time.perf_counter()
        api_result = predict_api(validated_datasets["api"])
        _log_timing("api_model_prediction", api_predict_started_at)

        system_predict_started_at = time.perf_counter()
        system_result = predict_system(validated_datasets["system"])
        _log_timing("system_model_prediction", system_predict_started_at)

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
        correlation_started_at = time.perf_counter()
        incident_data = generate_incident(
            auth_total=auth_result["total"],
            auth_anomalies=auth_result["anomalies"],
            api_total=api_result["total"],
            api_anomalies=api_result["anomalies"],
            system_total=system_result["total"],
            system_anomalies=system_result["anomalies"],
        )
        _log_timing("correlation_engine", correlation_started_at)

        # Save Incident record
        inc = Incident(
            run_id=run.id,
            incident_type="correlated_anomaly",
            severity=incident_data["risk_level"],
            description=incident_data["incident_summary"],
            risk_score=incident_data["risk_score"],
            risk_level=incident_data["risk_level"],
            incident_summary=incident_data["incident_summary"],
            explanations=incident_data["explanations"]
        )
        db.session.add(inc)

        # Complete run
        db_commit_started_at = time.perf_counter()
        run.status = "completed"
        db.session.commit()
        _log_timing("final_db_write", db_commit_started_at)
        _log_timing("total_request", request_started_at)

        # Return response with run_id
        incident_data["run_id"] = run.id
        return jsonify(incident_data)

    except SchemaValidationError as e:
        db.session.rollback()
        logger.warning(
            "Schema validation failed for analysis run; source_type=%s missing_columns=%s duplicate_columns=%s details=%s",
            e.source_type,
            e.missing_columns,
            e.duplicate_columns,
            e.details,
        )
        try:
            run.status = "failed"
            db.session.commit()
        except Exception:
            pass
        return jsonify(e.to_response()), 400

    except Exception as e:
        db.session.rollback()
        try:
            run.status = "failed"
            db.session.commit()
        except Exception:
            pass
        raise e
