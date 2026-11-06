from flask import Flask
from flask_cors import CORS

from api import register_blueprints

app = Flask(__name__)
CORS(app, expose_headers=["X-Data-Source"])
register_blueprints(app)

if __name__ == "__main__":
    # 5001, so it can run next to the BrownBro backend on 5000
    app.run(debug=True, port=5001)
