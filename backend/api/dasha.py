import anthropic
from flask import Blueprint, Response, jsonify, request, stream_with_context

from services.dasha import DashaInputError, DashaOfflineError, open_chat_stream

dasha_bp = Blueprint("dasha", __name__)

OFFLINE_MESSAGE = (
    "Dasha is offline: the backend has no Claude API key. "
    "Set ANTHROPIC_API_KEY and restart the backend."
)


@dasha_bp.route("/api/dasha/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}

    try:
        stream, close = open_chat_stream(body.get("messages"), body.get("page"))
    except DashaInputError as error:
        return jsonify({"error": str(error)}), 400
    except (DashaOfflineError, anthropic.AuthenticationError):
        return jsonify({"error": OFFLINE_MESSAGE, "code": "no_api_key"}), 503
    except anthropic.RateLimitError:
        return jsonify({"error": "Dasha is busy (rate limited). Try again in a minute."}), 429
    except anthropic.APIStatusError as error:
        return jsonify({"error": f"Claude API error ({error.status_code})."}), 502
    except anthropic.APIConnectionError:
        return jsonify({"error": "Could not reach the Claude API."}), 502

    def generate():
        try:
            for text in stream.text_stream:
                yield text
            final = stream.get_final_message()
            if final.stop_reason == "refusal":
                yield "\n\n(I can't help with that one.)"
            elif final.stop_reason == "max_tokens":
                yield "\n\n(Answer cut off, it was too long.)"
        except anthropic.APIError:
            yield "\n\n(Connection to Claude was lost. Please try again.)"
        finally:
            close()

    # Plain text chunks; the frontend appends them as they arrive
    return Response(
        stream_with_context(generate()),
        mimetype="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
