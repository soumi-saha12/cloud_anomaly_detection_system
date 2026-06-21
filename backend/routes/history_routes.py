from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.analysis_run import AnalysisRun
from models.incident import Incident

history_bp = Blueprint("history", __name__)


def _source_breakdown(run):
    return {
        result.source_type: {
            "total_records": result.total_records,
            "anomaly_count": result.anomaly_count,
            "anomaly_percentage": result.anomaly_percentage,
        }
        for result in run.source_results
    }


@history_bp.get("/history")
@jwt_required()
def get_history():
    user_id = get_jwt_identity()

    # Eager load the incident relationship to prevent N+1 query overhead
    runs = (
        AnalysisRun.query.filter_by(user_id=int(user_id))
        .options(
            db.joinedload(AnalysisRun.incident),
            db.joinedload(AnalysisRun.source_results),
        )
        .order_by(AnalysisRun.created_at.desc())
        .all()
    )

    history_list = []
    for run in runs:
        source_breakdown = _source_breakdown(run)
        history_list.append({
            "id": run.id,
            "run_id": run.id,
            "run_name": run.run_name,
            "name": run.name or run.run_name,
            "notes": run.notes,
            "risk_score": run.incident.risk_score if run.incident else None,
            "risk_level": run.incident.risk_level if run.incident else None,
            "status": run.status,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "auth_anomalies": source_breakdown.get("auth", {}).get("anomaly_count", 0),
            "api_anomalies": source_breakdown.get("api", {}).get("anomaly_count", 0),
            "system_anomalies": source_breakdown.get("system", {}).get("anomaly_count", 0),
            "source_breakdown": source_breakdown,
        })

    return jsonify({"history": history_list}), 200


@history_bp.put("/history/<int:run_id>/rename")
@jwt_required()
def rename_history(run_id):
    user_id = get_jwt_identity()

    data = request.get_json(silent=True) or {}
    new_name = data.get("name")

    if not new_name or not isinstance(new_name, str) or not new_name.strip():
        return jsonify({"error": "Name is required and cannot be empty"}), 400

    new_name = new_name.strip()

    run = AnalysisRun.query.get(run_id)
    if not run:
        return jsonify({"error": "Analysis run not found"}), 404

    if run.user_id != int(user_id):
        return jsonify({"error": "Access denied"}), 403

    try:
        run.name = new_name
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while updating name"}), 500

    return jsonify({
        "message": "Analysis renamed successfully",
        "run": run.to_dict()
    }), 200


@history_bp.delete("/history/<int:run_id>")
@jwt_required()
def delete_history(run_id):
    user_id = get_jwt_identity()

    run = AnalysisRun.query.get(run_id)
    if not run:
        return jsonify({"error": "Analysis run not found"}), 404

    if run.user_id != int(user_id):
        return jsonify({"error": "Access denied"}), 403

    try:
        db.session.delete(run)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise e

    return jsonify({"message": "Analysis deleted successfully"}), 200


@history_bp.get("/history/<int:run_id>")
@jwt_required()
def get_history_detail(run_id):
    user_id = get_jwt_identity()

    run = AnalysisRun.query.get(run_id)
    if not run:
        return jsonify({"error": "Analysis run not found"}), 404

    # Prevent users from accessing other users' records
    if run.user_id != int(user_id):
        return jsonify({"error": "Access denied"}), 403

    return jsonify(run.to_dict()), 200


@history_bp.get("/incidents")
@jwt_required()
def get_incidents():
    user_id = get_jwt_identity()

    # Join Incident to AnalysisRun to filter by user_id
    incidents = (
        db.session.query(Incident)
        .join(AnalysisRun)
        .filter(AnalysisRun.user_id == int(user_id))
        .order_by(Incident.created_at.desc())
        .all()
    )

    incident_list = []
    for inc in incidents:
        incident_list.append({
            "incident_id": inc.id,
            "run_id": inc.analysis_run_id,
            "risk_score": inc.risk_score,
            "risk_level": inc.risk_level,
            "incident_summary": inc.incident_summary,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })

    return jsonify({"incidents": incident_list}), 200


@history_bp.get("/dashboard")
@jwt_required()
def get_dashboard_summary():
    user_id = get_jwt_identity()

    # 1. Total analysis runs count
    total_analyses = AnalysisRun.query.filter_by(user_id=int(user_id)).count()

    # 2. Total incidents generated (corresponds to completed runs with risk scores)
    total_incidents = (
        Incident.query.join(AnalysisRun)
        .filter(AnalysisRun.user_id == int(user_id))
        .count()
    )

    # 3. Average risk score computation
    avg_score_res = (
        db.session.query(db.func.avg(Incident.risk_score))
        .join(AnalysisRun)
        .filter(AnalysisRun.user_id == int(user_id))
        .scalar()
    )
    average_risk_score = round(float(avg_score_res), 2) if avg_score_res is not None else 0.0

    # 4. Incident counts grouped by risk level
    level_counts_res = (
        db.session.query(Incident.risk_level, db.func.count(Incident.id))
        .join(AnalysisRun)
        .filter(AnalysisRun.user_id == int(user_id))
        .group_by(Incident.risk_level)
        .all()
    )

    counts = {level: 0 for level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
    for level, count in level_counts_res:
        if level in counts:
            counts[level] = count

    return jsonify({
        "total_analyses": total_analyses,
        "total_incidents": total_incidents,
        "critical_incidents": counts["CRITICAL"],
        "high_incidents": counts["HIGH"],
        "medium_incidents": counts["MEDIUM"],
        "low_incidents": counts["LOW"],
        "average_risk_score": average_risk_score
    }), 200


@history_bp.get("/dashboard/trends")
@jwt_required()
def get_dashboard_trends():
    user_id = get_jwt_identity()

    # Fetch incident risk scores chronologically over time
    trend_data = (
        db.session.query(Incident.created_at, Incident.risk_score)
        .join(AnalysisRun)
        .filter(AnalysisRun.user_id == int(user_id))
        .order_by(Incident.created_at.asc())
        .all()
    )

    trends = []
    for item in trend_data:
        trends.append({
            "date": item.created_at.date().isoformat() if item.created_at else None,
            "risk_score": item.risk_score
        })

    return jsonify({"trends": trends}), 200
