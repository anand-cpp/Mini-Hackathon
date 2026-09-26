"""Reciprocal matching engine. Pure Python, deterministic, offline-safe."""

from typing import Any

from .db import get_conn

def _norm(s: str) -> str:
    return " ".join(s.strip().lower().split())

def match_student(student_id: int) -> list[dict[str, Any]]:
    conn = get_conn()
    me_skills = conn.execute(
        "SELECT id, name, category, direction, level FROM skills WHERE student_id=?", (student_id,)
    ).fetchall()

    me_teach = {_norm(r["name"]): r for r in me_skills if r["direction"] == "teach"}
    me_learn = {_norm(r["name"]): r for r in me_skills if r["direction"] == "learn"}

    accepted_pairs: set[tuple[int, int]] = set()
    for row in conn.execute(
        "SELECT sender_id, receiver_id FROM requests WHERE status='accepted'"
    ).fetchall():
        accepted_pairs.add((row["sender_id"], row["receiver_id"]))
        accepted_pairs.add((row["receiver_id"], row["sender_id"]))

    others = conn.execute(
        "SELECT id, name, college, bio FROM students WHERE id != ?", (student_id,)
    ).fetchall()

    results: list[dict[str, Any]] = []
    for other in others:
        oid = other["id"]
        oskills = conn.execute(
            "SELECT id, name, category, direction, level FROM skills WHERE student_id=?", (oid,)
        ).fetchall()
        o_teach = {_norm(r["name"]): r for r in oskills if r["direction"] == "teach"}
        o_learn = {_norm(r["name"]): r for r in oskills if r["direction"] == "learn"}

        # skills they can teach me (sorted by my learn order, then their level)
        give_names = [n for n in me_learn if n in o_teach]
        # skills I can teach them (their wants)
        get_names = [n for n in me_teach if n in o_learn]

        if not give_names and not get_names:
            continue

        give = [{"skill_id": o_teach[n]["id"], "name": o_teach[n]["name"], "category": o_teach[n]["category"], "level": o_teach[n]["level"]} for n in give_names]
        get = [{"skill_id": me_teach[n]["id"], "name": me_teach[n]["name"], "category": me_teach[n]["category"], "level": me_teach[n]["level"]} for n in get_names]

        gives_count = len(give)
        gets_count = len(get)
        mutual = gives_count > 0 and gets_count > 0

        # score: reciprocal lean, transparent (0-100 scale-ish)
        score = 40 * gives_count + 25 * gets_count
        if mutual:
            score += 35  # swap bonus
        # mentor expertise lifts the give side weight
        for g in give:
            if g["level"] == "expert":
                score += 5
        score = min(score, 100)

        reasons: list[str] = []
        if give:
            top = give[0]
            reasons.append(f"{other['name']} teaches {top['name']}, which YOU want to learn")
        if get:
            top = get[0]
            reasons.append(f"{other['name']} wants to learn {top['name']}, which you can teach")

        results.append({
            "type": "MUTUAL" if mutual else "RELEVANT",
            "peer": {"id": oid, "name": other["name"], "college": other["college"], "bio": other["bio"]},
            "score": score,
            "give": give,
            "get": get,
            "reasons": reasons,
            "connected": (student_id, oid) in accepted_pairs,
        })

    results.sort(key=lambda m: (0 if m["type"] == "MUTUAL" else 1, -m["score"]))
    return results