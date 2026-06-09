from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, abort
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from services.prediction_service import (
    predict_api,
    predict_auth,
    predict_system,
)
from services.correlation_engine import generate_incident

analysis_bp = Blueprint("analysis", __name__)


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
def analyze():
    uploaded_files = _get_uploaded_files()

    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    upload_folder.mkdir(parents=True, exist_ok=True)

    saved_paths = {}
    for source_name, file_storage in uploaded_files.items():
        filename = secure_filename(file_storage.filename or f"{source_name}.csv")
        file_path = upload_folder / f"{source_name}_{filename}"
        file_storage.save(file_path)
        saved_paths[source_name] = str(file_path)

    auth_result = predict_auth(saved_paths["auth"])
    api_result = predict_api(saved_paths["api"])
    system_result = predict_system(saved_paths["system"])

    incident = generate_incident(
        auth_total=auth_result["total"],
        auth_anomalies=auth_result["anomalies"],
        api_total=api_result["total"],
        api_anomalies=api_result["anomalies"],
        system_total=system_result["total"],
        system_anomalies=system_result["anomalies"],
    )

    return jsonify(incident)
