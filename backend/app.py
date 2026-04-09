from __future__ import annotations

import json
import os
import re

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import fetch_leaderboard, init_db, insert_score, list_characters

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9 _-]{1,20}$")


def parse_cors_origins():
    raw_origins = os.getenv("CHAOS_RUNNER_CORS_ORIGINS", "*").strip()
    if raw_origins == "*":
        return "*"

    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
CORS(app, resources={r"/api/*": {"origins": parse_cors_origins()}})
init_db()


@app.get("/api/health")
def health_check():
    return jsonify({"status": "ok"})


@app.get("/api/characters")
def characters():
    return jsonify({"characters": list_characters()})


@app.get("/api/leaderboard")
def leaderboard():
    limit = request.args.get("limit", default=10, type=int)
    return jsonify({"entries": fetch_leaderboard(limit=limit)})


@app.post("/api/scores")
def submit_score():
    payload = request.get_json(silent=True) or {}

    username = str(payload.get("username", "")).strip()
    character_id = str(payload.get("characterId", "")).strip()
    result_type = str(payload.get("resultType", "loss")).strip() or "loss"
    stats = payload.get("stats", {})

    try:
        score = int(payload.get("score", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Score must be a whole number."}), 400

    if not USERNAME_PATTERN.fullmatch(username):
        return (
            jsonify(
                {
                    "error": "Username is required and can only include letters, numbers, spaces, dashes, and underscores."
                }
            ),
            400,
        )

    valid_character_ids = {character["id"] for character in list_characters()}
    if character_id not in valid_character_ids:
        return jsonify({"error": "Please choose a valid character before submitting a score."}), 400

    if score < 0:
        return jsonify({"error": "Score cannot be negative."}), 400

    if result_type not in {"win", "loss"}:
        result_type = "loss"

    stats_json = json.dumps(stats, separators=(",", ":"), ensure_ascii=True)

    new_id = insert_score(
        username=username,
        score=score,
        character_id=character_id,
        result_type=result_type,
        stats_json=stats_json,
    )

    return jsonify(
        {
            "message": "Score saved.",
            "scoreId": new_id,
            "entries": fetch_leaderboard(limit=10),
        }
    ), 201


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(debug=debug, host="0.0.0.0", port=port)
