from flask import Blueprint, request, json
from utils.message_processor import process_message

api_bp = Blueprint('api', __name__)

@api_bp.route("/get_response", methods=["POST"])
def get_response():
    user_id = request.remote_addr
    user_message = request.form["question"].strip().lower()
    response = process_message(user_id, user_message)
    if isinstance(response, dict):
        return json.jsonify(response)
    return json.jsonify({"type": "text", "message": response})