from flask import Blueprint, jsonify


analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.post("/analyze")
def analyze():
    return jsonify({"risk_score": 89, "risk_level": "CRITICAL"})
