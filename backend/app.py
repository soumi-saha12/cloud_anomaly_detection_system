from flask import Flask, jsonify
from werkzeug.exceptions import BadRequest, InternalServerError, NotFound

from config import Config
from routes.analysis_routes import analysis_bp
from extensions import db, migrate, cors
import models


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

    app.register_blueprint(analysis_bp)

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
