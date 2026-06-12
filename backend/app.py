from flask import Flask, jsonify
from werkzeug.exceptions import BadRequest, NotFound

from config import Config
from routes.analysis_routes import analysis_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
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

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
