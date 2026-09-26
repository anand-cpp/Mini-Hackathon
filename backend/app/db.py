import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "skillswap.db"

LEVELS = {"beginner", "intermediate", "expert"}

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    college TEXT NOT NULL,
    bio TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    direction TEXT NOT NULL CHECK (direction IN ('teach','learn')),
    level TEXT DEFAULT 'intermediate'
);

CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teach_skill_id INTEGER NOT NULL REFERENCES skills(id),
    learn_skill_id INTEGER NOT NULL REFERENCES skills(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed')),
    created_at TEXT DEFAULT (datetime('now')),
    decided_at TEXT
);
"""

SEED = [
    {
        "name": "Riya Sharma", "college": "IIT Delhi",
        "bio": "CS sophomore who loves teaching. Learning the web and the guitar.",
        "skills": [
            ("Python", "Programming", "teach", "expert"),
            ("Public Speaking", "Communication", "teach", "expert"),
            ("Web Development", "Web", "learn", "beginner"),
            ("Guitar", "Music", "learn", "beginner"),
        ],
    },
    {
        "name": "Arjun Nair", "college": "NIT Trichy",
        "bio": "Full-stack enthusiast. Can build websites, wants to automate things with Python.",
        "skills": [
            ("Web Development", "Web", "teach", "expert"),
            ("Photography", "Creative", "teach", "intermediate"),
            ("Python", "Programming", "learn", "intermediate"),
        ],
    },
    {
        "name": "Sneha Patel", "college": "BITS Pilani",
        "bio": "Guitarist for 6 years. Terrified of stage, working on my public speaking.",
        "skills": [
            ("Guitar", "Music", "teach", "expert"),
            ("Public Speaking", "Communication", "learn", "beginner"),
        ],
    },
    {
        "name": "Karthik Iyer", "college": "IIIT Hyderabad",
        "bio": "Data nerd. Numbers make sense to me, portraits do not.",
        "skills": [
            ("Data Science", "Data", "teach", "expert"),
            ("SQL", "Data", "teach", "expert"),
            ("Photography", "Creative", "learn", "beginner"),
        ],
    },
    {
        "name": "Meera Krishnan", "college": "VIT Vellore",
        "bio": "Designer with a camera. Want to understand what the data people talk about.",
        "skills": [
            ("Photography", "Creative", "teach", "intermediate"),
            ("UI Design", "Design", "teach", "expert"),
            ("Data Science", "Data", "learn", "beginner"),
        ],
    },
    {
        "name": "Dev Malhotra", "college": "DTU Delhi",
        "bio": "I write and I speak. Trying to ship my first portfolio site.",
        "skills": [
            ("Public Speaking", "Communication", "teach", "intermediate"),
            ("Writing", "Communication", "teach", "expert"),
            ("Web Development", "Web", "learn", "beginner"),
        ],
    },
    {
        "name": "Ananya Rao", "college": "Manipal Institute of Technology",
        "bio": "Frontend dev who avoids the mic at all costs. Fixing that now.",
        "skills": [
            ("Web Development", "Web", "teach", "expert"),
            ("Public Speaking", "Communication", "learn", "beginner"),
        ],
    },
    {
        "name": "Vikram Singh", "college": "IIT Roorkee",
        "bio": "Android dev by day, musician by night. Want to level up Python and speaking.",
        "skills": [
            ("Mobile App Development", "Web", "teach", "expert"),
            ("Guitar", "Music", "teach", "intermediate"),
            ("Python", "Programming", "learn", "intermediate"),
            ("Public Speaking", "Communication", "learn", "beginner"),
        ],
    },
    {
        "name": "Ishita Verma", "college": "NSUT Delhi",
        "bio": "Python teaching assistant. Dreaming of learning the guitar.",
        "skills": [
            ("Python", "Programming", "teach", "expert"),
            ("Guitar", "Music", "learn", "beginner"),
        ],
    },
    {
        "name": "Aditya Joshi", "college": "COEP Pune",
        "bio": "ML researcher. Zero design sense, huge curiosity.",
        "skills": [
            ("Data Science", "Data", "teach", "expert"),
            ("UI Design", "Design", "learn", "beginner"),
        ],
    },
    {
        "name": "Nandini Kulkarni", "college": "PES Bangalore",
        "bio": "SQL and dashboards. Trying to become a better writer.",
        "skills": [
            ("SQL", "Data", "teach", "expert"),
            ("Writing", "Communication", "learn", "intermediate"),
        ],
    },
    {
        "name": "Rahul Menon", "college": "IIT Madras",
        "bio": "Writer-turned-analyst. Peeking into data science.",
        "skills": [
            ("Writing", "Communication", "teach", "expert"),
            ("Data Science", "Data", "learn", "intermediate"),
        ],
    },
    {
        "name": "Pooja Deshpande", "college": "SICSR Pune",
        "bio": "Designer and video editor. Want to build the apps behind my designs.",
        "skills": [
            ("Graphic Design", "Design", "teach", "expert"),
            ("Video Editing", "Creative", "teach", "intermediate"),
            ("Mobile App Development", "Web", "learn", "beginner"),
        ],
    },
    {
        "name": "Farhan Ali", "college": "Jamia Millia Islamia",
        "bio": "Flutter developer who edits nothing and wishes he did.",
        "skills": [
            ("Mobile App Development", "Web", "teach", "expert"),
            ("Video Editing", "Creative", "learn", "beginner"),
        ],
    },
    # --- deliberate 3-person exchange cycle: Neha -> Omar -> Priya -> Neha ---
    {
        "name": "Neha Kapoor", "college": "SRCC Delhi",
        "bio": "Amateur photographer saving up for a better lens. Wants Spanish for travel.",
        "skills": [
            ("Photography", "Creative", "teach", "intermediate"),
            ("Spanish", "Languages", "learn", "beginner"),
        ],
    },
    {
        "name": "Omar Sheikh", "college": "St. Xavier's Mumbai",
        "bio": "Fluent in Spanish, helpless at spreadsheets. Looking to learn Excel.",
        "skills": [
            ("Spanish", "Languages", "teach", "expert"),
            ("Excel", "Data", "learn", "beginner"),
        ],
    },
    {
        "name": "Priya Reddy", "college": "BITS Hyderabad",
        "bio": "Excel wizard who has never owned a camera. Wants to learn photography.",
        "skills": [
            ("Excel", "Data", "teach", "expert"),
            ("Photography", "Creative", "learn", "beginner"),
        ],
    },
    # --- edge case: student with NO matches on the platform ---
    {
        "name": "Isha Kulkarni", "college": "Fergusson College Pune",
        "bio": "History enthusiast. Searching for a niche skill community.",
        "skills": [
            ("Ancient History", "Other", "teach", "expert"),
            ("Archaeology", "Other", "learn", "intermediate"),
        ],
    },
]


def init_db() -> None:
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()

    count = conn.execute("SELECT COUNT(*) AS c FROM students").fetchone()["c"]
    if count == 0:
        seed(conn)
    conn.close()


def seed(conn: sqlite3.Connection) -> None:
    for s in SEED:
        cur = conn.execute(
            "INSERT INTO students (name, college, bio) VALUES (?,?,?)",
            (s["name"], s["college"], s["bio"]),
        )
        sid = cur.lastrowid
        for name, cat, direction, level in s["skills"]:
            conn.execute(
                "INSERT INTO skills (student_id, name, category, direction, level) VALUES (?,?,?,?,?)",
                (sid, name, cat, direction, level),
            )
    conn.commit()