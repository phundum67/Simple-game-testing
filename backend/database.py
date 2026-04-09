"""Small SQLite data layer that can later be swapped for another database."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from seed_data import CHARACTERS, STARTER_SCORES

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "leaderboard.db"


def get_database_path() -> Path:
    custom_path = os.getenv("CHAOS_RUNNER_DB")
    return Path(custom_path) if custom_path else DEFAULT_DB_PATH


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(get_database_path())
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                score INTEGER NOT NULL,
                character_id TEXT NOT NULL,
                result_type TEXT NOT NULL,
                stats_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        score_count = connection.execute(
            "SELECT COUNT(*) AS total FROM leaderboard"
        ).fetchone()["total"]

        if score_count == 0:
            connection.executemany(
                """
                INSERT INTO leaderboard (username, score, character_id, result_type, stats_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                STARTER_SCORES,
            )


def list_characters() -> list[dict]:
    return CHARACTERS


def fetch_leaderboard(limit: int = 10) -> list[dict]:
    safe_limit = max(1, min(limit, 50))

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, username, score, character_id, result_type, stats_json, created_at
            FROM leaderboard
            ORDER BY score DESC, created_at ASC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

    characters_by_id = {character["id"]: character for character in CHARACTERS}
    leaderboard = []

    for index, row in enumerate(rows, start=1):
        character = characters_by_id.get(row["character_id"], {})
        leaderboard.append(
            {
                "rank": index,
                "id": row["id"],
                "username": row["username"],
                "score": row["score"],
                "characterId": row["character_id"],
                "characterName": character.get("name", "Unknown Hero"),
                "resultType": row["result_type"],
                "date": row["created_at"],
            }
        )

    return leaderboard


def insert_score(
    username: str,
    score: int,
    character_id: str,
    result_type: str,
    stats_json: str,
) -> int:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO leaderboard (username, score, character_id, result_type, stats_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (username, score, character_id, result_type, stats_json),
        )
        connection.commit()
        return int(cursor.lastrowid)

