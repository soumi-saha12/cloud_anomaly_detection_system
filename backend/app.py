from flask import Flask, jsonify
from werkzeug.exceptions import BadRequest, InternalServerError, NotFound

from config import Config
from routes.analysis_routes import analysis_bp
from routes.auth_routes import auth_bp
from extensions import db, migrate, cors, jwt
from models.revoked_token import RevokedToken
import models


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})
    jwt.init_app(app)

    # Register JWT token blocklist check
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        token = RevokedToken.query.filter_by(jti=jti).first()
        return token is not None

    # Custom JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Signature verification failed"}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Missing authorization header"}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked"}), 401

    app.register_blueprint(analysis_bp)
    app.register_blueprint(auth_bp)

    @app.get("/")
    def home():
        return jsonify({"message": "Cloud Anomaly Detection API"})

    @app.errorhandler(BadRequest)
    def handle_bad_request(error):
        return jsonify({"error": "Invalid request"}), 400

    @app.errorhandler(NotFound)
    def handle_not_found(error):
        return jsonify({"error": "Route not found"}), 404

    @app.errorhandler(InternalServerError)
    def handle_internal_server_error(error):
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
