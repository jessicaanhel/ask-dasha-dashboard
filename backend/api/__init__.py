from api.dasha import dasha_bp
from api.mortgage import mortgage_bp

BLUEPRINTS = [
    mortgage_bp,
    dasha_bp,
]


def register_blueprints(app):
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)
