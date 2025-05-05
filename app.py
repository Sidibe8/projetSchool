from flask import Flask
from routes.main_routes import main_bp
from routes.api_routes import api_bp

app = Flask(__name__)

# Enregistrement des blueprints
app.register_blueprint(main_bp)
app.register_blueprint(api_bp, url_prefix='/api')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)