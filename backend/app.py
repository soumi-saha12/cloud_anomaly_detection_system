from flask import Flask, jsonify

from config import Config
from routes.analysis_routes import analysis_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.register_blueprint(analysis_bp)

    @app.get("/")
    def home():
        return jsonify({"message": "Cloud Anomaly Detection API"})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
