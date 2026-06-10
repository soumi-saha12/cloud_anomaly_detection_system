from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required,
    get_jwt,
    get_jwt_identity,
    create_access_token
)
from extensions import db
from models.user import User
from models.revoked_token import RevokedToken
from services.auth_service import register_user, login_user

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    organization = data.get("organization")

    result = register_user(email, password, full_name, organization)

    if "error" in result:
        return jsonify({"error": result["error"]}), result["status"]

    return jsonify({
        "message": "Registration successful",
        "user": result["user"],
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"]
    }), 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    result = login_user(email, password)

    if "error" in result:
        return jsonify({"error": result["error"]}), result["status"]

    return jsonify({
        "message": "Login successful",
        "user": result["user"],
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"]
    }), 200


@auth_bp.post("/logout")
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    revoked_token = RevokedToken(jti=jti)
    db.session.add(revoked_token)
    db.session.commit()
    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    additional_claims = {
        "email": user.email,
        "role": user.role
    }
    # Identity is cast to string to align with initial token creation
    new_access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    return jsonify({"access_token": new_access_token}), 200


@auth_bp.get("/profile")
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Calculate total runs for the profile dashboard integration
    total_runs = len(user.analysis_runs) if user.analysis_runs else 0
    profile_data = user.to_dict()
    profile_data["total_analyses"] = total_runs

    return jsonify({"user": profile_data}), 200
