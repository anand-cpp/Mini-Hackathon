# SkillSwap

**Skill exchange, not a directory.**

SkillSwap helps students trade skills with each other. Instead of a static list of
mentors, it maps the skill network and finds **reciprocal exchanges**: people who
teach exactly what you want to learn, AND want to learn what you can teach.

Built and shipped inside a 200-minute hackathon budget.

## What it does

- **Declare skills** — what you can teach and what you want to learn.
- **Find your exchanges** — the matching engine scores the whole student network and
  ranks matches into two transparent classes:
  - **MUTUAL** — a perfect 2-way swap (they teach what you learn, you teach what they
    learn). Shown with the exact exchange loop and the checks behind it.
  - **RELEVANT** — a one-way mentor (they teach what you want, or want what you teach).
- **Exchange chains** — when no direct swap exists, SkillSwap finds **3-person cycles**
  (A teaches B, B teaches C, C teaches A) and explains the loop.
- **Close the loop** — request an exchange → partner accepts → mark it completed.
  Every state is visible in a live inbox: incoming, outgoing, active, completed.

### Why it's different

- **No match percentages.** Matches come with the *reasons and checks* that produce
  them — the swap loop, the skills, the expert flags. Every result is explainable.
- **Reciprocity is the product.** People aren't ranked by one-way "mentor scores";
  the engine optimises for exchanges both sides win.
- **Skill normalization** maps synonyms (ReactJS → Web Development, speaking →
  Public Speaking) so matching works on meaning, not on accidental string equality.
- **Deterministic and offline-safe.** Pure Python + SQLite. No external APIs, no AI,
  no embeddings — every match is reproducible from the same data.

## Demo storyline (live workflow ~90 seconds)

1. Open the app → Riya Sharma is preselected. Note her teach/learn chips.
2. **Find my exchanges** → Riya gets **4 mutual swaps** (Vikram: "They teach Guitar →
   you learn / You teach Python → they learn" with the checks listed).
3. **Request exchange** with Vikram → the card flips to "Request sent / waiting".
4. Switch to **Vikram** (sidebar) → his inbox shows Riya's incoming request → **Accept**.
   The exchange moves to "Active exchanges" with role-aware text for each user.
5. **Mark exchange completed** → the loop closes: "✓ Riya taught you Public Speaking
   and you taught them Guitar."
6. Edge cases on the same network: **Isha** has no direct match (honest empty state),
   **Neha** gets a **3-person cycle** (Neha→Priya→Omar→Neha: photography for Excel for
   Spanish).

## Architecture

```
frontend/   Vite + React + TypeScript     (production build ~72 kB gzip)
backend/    FastAPI + SQLite (stdlib)     (pure Python, deterministic engine)
```

- `backend/app/db.py` — schema + 18-student seeded network with deliberately
  designed cases: mutuals, one-way mentors, a no-match user, a perfect 3-person cycle.
- `backend/app/normalize.py` — skill alias/normalization map.
- `backend/app/matching.py` — `match_student` (match classes + checks + reasons) and
  `find_cycles` (3-person exchange-cycle detection).
- `backend/app/main.py` — REST API: students, skills, matches, cycles, requests with
  a full lifecycle (`pending → accepted → completed`) and ownership validation.

The engine is generic over the skill graph (N students × M skills); the seed data is
just demo records — nothing is special-cased.

## Run it

```bash
# backend (http://127.0.0.1:8000)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# frontend (http://localhost:5173 dev, or npm run preview after a build)
cd frontend
npm install
npm run dev
```

CORS is open for local dev; the DB is created and seeded automatically on first run.

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/students` | create student with teach/learn skills (normalized) |
| GET | `/api/students` | list students with teach/learn counts |
| GET | `/api/students/{id}` | student detail |
| POST | `/api/students/{id}/matches` | ranked MUTUAL/RELEVANT matches with checks |
| POST | `/api/students/{id}/cycles` | 3-person exchange chains |
| GET | `/api/requests/{id}` | sender + receiver requests for a student |
| POST | `/api/requests` | send exchange request (validates skill ownership) |
| POST | `/api/requests/{id}/accept` | accept (creates the exchange) |
| POST | `/api/requests/{id}/reject` | decline |
| POST | `/api/requests/{id}/complete` | mark the exchange completed |