from flask import Flask, jsonify

from config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    @app.get("/")
    def home():
        return jsonify({"message": "Cloud Anomaly Detection API"})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
