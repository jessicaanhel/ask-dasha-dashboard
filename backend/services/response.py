from flask import jsonify


def data_response(payload, source):
    response = jsonify(payload)
    response.headers["X-Data-Source"] = source
    return response


def combine_sources(sources):
    unique = set(sources)
    if unique == {"live"}:
        return "live"
    if unique <= {"mock"}:
        return "mock"
    return "partial"
