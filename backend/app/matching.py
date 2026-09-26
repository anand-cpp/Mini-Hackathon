"""Reciprocal matching engine. Pure Python, deterministic, offline-safe.

Operates generically over the skill graph (N students x M skills) —
seed data is just demo records, the engine logic does not special-case it.
"""

from typing import Any

from .db import get_conn
from .normalize import normalize


def _norm(name: str) -> str:
    return " ".join(normalize(name).lower().split())


def _canonical(row) -> dict:
    return {
        "skill_id": row["id"],
        "name": normalize(row["name"]),
        "category": row["category"],
        "level": row["level"],
    }


def match_student(student_id: int) -> list[dict[str, Any]]:
    """Rank all other students by exchange value for `student_id`.

    Match classes (ranked first-class, then by score):
      MUTUAL  - I teach something they want AND they teach something I want
      RELEVANT- they can teach something I want (or vice versa), no loop
    """
    conn = get_conn()
    me_skills = conn.execute(
        "SELECT id, name, category, direction, level FROM skills WHERE student_id=?", (student_id,)
    ).fetchall()

    me_teach = {_norm(r["name"]): r for r in me_skills if r["direction"] == "teach"}
    me_learn = {_norm(r["name"]): r for r in me_skills if r["direction"] == "learn"}

    accepted_pairs: set[tuple[int, int]] = set()
    requests_view: dict[tuple[int, int], dict] = {}
    for row in conn.execute(
        "SELECT sender_id, receiver_id, status, id FROM requests WHERE status IN ('pending','accepted')"
    ).fetchall():
        pair = (row["sender_id"], row["receiver_id"])
        requests_view[pair] = {"request_id": row["id"], "status": row["status"]}
        if row["status"] == "accepted":
            accepted_pairs.add(pair)
            accepted_pairs.add((pair[1], pair[0]))

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

        give_names = [n for n in me_learn if n in o_teach]  # they can teach me
        get_names = [n for n in me_teach if n in o_learn]   # I can teach them

        if not give_names and not get_names:
            continue

        give = [_canonical(o_teach[n]) for n in give_names]
        get = [_canonical(me_teach[n]) for n in get_names]

        mutual = bool(give and get)

        # transparent score used ONLY for ordering within a class
        score = 40 * len(give) + 25 * len(get)
        if mutual:
            score += 35
        for g in give:
            if g["level"] == "expert":
                score += 5

        checks = []
        if give:
            checks.append("They can teach what you want to learn")
        if get:
            checks.append("They want to learn what you can teach")
        if mutual:
            checks.append("Perfect reciprocal exchange")
        if give and any(g["level"] == "expert" for g in give):
            checks.append("Expert mentor available")

        reasons = []
        if give:
            reasons.append(f"{other['name']} teaches {give[0]['name']}, which YOU want to learn")
        if get:
            reasons.append(f"{other['name']} wants to learn {get[0]['name']}, which you can teach")

        state = requests_view.get((student_id, oid)) or requests_view.get((oid, student_id))
        results.append({
            "type": "MUTUAL" if mutual else "RELEVANT",
            "peer": {"id": oid, "name": other["name"], "college": other["college"], "bio": other["bio"]},
            "score": score,
            "give": give,
            "get": get,
            "checks": checks,
            "reasons": reasons,
            "connected": bool(state and state["status"] == "accepted"),
            "request": state,
        })

    results.sort(key=lambda m: (0 if m["type"] == "MUTUAL" else 1, -m["score"]))
    return results


def find_cycles(student_id: int) -> list[dict[str, Any]]:
    """Find 3-person exchange cycles that include `student_id`.

    ME -> B -> C -> ME:
      ME teaches s1 that B wants, B teaches s2 that C wants, C teaches s3 that ME wants.
    """
    conn = get_conn()
    me_teach = {
        _norm(r["name"]): _canonical(r)
        for r in conn.execute("SELECT id,name,category,direction,level FROM skills WHERE student_id=? AND direction='teach'", (student_id,)).fetchall()
    }
    me_learn = {
        _norm(r["name"]): _canonical(r)
        for r in conn.execute("SELECT id,name,category,direction,level FROM skills WHERE student_id=? AND direction='learn'", (student_id,)).fetchall()
    }
    if not me_teach or not me_learn:
        return []

    # candidate B: wants any skill I teach
    candidates = conn.execute(
        "SELECT DISTINCT s.id FROM students s WHERE s.id != ?", (student_id,)
    ).fetchall()

    b_list = []
    for b in candidates:
        wants = {
            _norm(r["name"]): _canonical(r)
            for r in conn.execute("SELECT id,name,category,direction,level FROM skills WHERE student_id=? AND direction='learn'", (b["id"],)).fetchall()
        }
        teaches = {
            _norm(r["name"]): _canonical(r)
            for r in conn.execute("SELECT id,name,category,direction,level FROM skills WHERE student_id=? AND direction='teach'", (b["id"],)).fetchall()
        }
        b_gives = [n for n in me_teach if n in wants]  # I teach -> B wants
        if b_gives:
            b_list.append({"id": b["id"], "give_names": b_gives, "teaches": teaches})

    cycles = []
    seen = set()
    for b in b_list:
        # C wants a skill B teaches
        for s2 in b["teaches"]:
            c_rows = conn.execute(
                "SELECT DISTINCT s.id, s.name, s.college FROM students s "
                "JOIN skills k ON k.student_id=s.id AND k.direction='learn' AND k.name=? WHERE s.id != ? AND s.id != ?",
                (b["teaches"][s2]["name"], student_id, b["id"]),
            ).fetchall()
            for c in c_rows:
                c_teaches = {
                    _norm(r["name"]): _canonical(r)
                    for r in conn.execute("SELECT id,name,category,direction,level FROM skills WHERE student_id=? AND direction='teach'", (c["id"],)).fetchall()
                }
                for s3 in c_teaches:
                    if s3 in me_learn:
                        key = (b["id"], c["id"], b["teaches"][s2]["name"])
                        if key in seen:
                            continue
                        seen.add(key)
                        bname = conn.execute("SELECT name FROM students WHERE id=?", (b["id"],)).fetchone()["name"]
                        cycles.append({
                            "exchange": [
                                {"from": "You", "to": bname, "skill": b["give_names"][0]},
                                {"from": bname, "to": c["name"], "skill": b["teaches"][s2]["name"]},
                                {"from": c["name"], "to": "You", "skill": c_teaches[s3]["name"]},
                            ],
                            "participants": [
                                {"id": student_id, "name": "You"},
                                {"id": b["id"], "name": bname},
                                {"id": c["id"], "name": c["name"]},
                            ],
                        })
    return cycles