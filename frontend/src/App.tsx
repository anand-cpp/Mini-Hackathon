import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  Cycle,
  ExchangeRequest,
  Match,
  RequestsResponse,
  Student,
  StudentSummary,
} from "./types";
import "./App.css";

const DEFAULTSKILLS = [
  "Web Development",
  "Python",
  "Data Science",
  "SQL",
  "Public Speaking",
  "Writing",
  "Photography",
  "Guitar",
  "Mobile App Development",
  "UI Design",
  "Graphic Design",
  "Video Editing",
  "Spanish",
  "Excel",
];

type Tab = "exchanges" | "inbox" | "new";

export default function App() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [requests, setRequests] = useState<RequestsResponse | null>(null);
  const [tab, setTab] = useState<Tab>("exchanges");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api
      .listStudents()
      .then((list) => {
        setStudents(list);
        const first = list.find((s) => s.name === "Riya Sharma") ?? list[0];
        if (first) {
          setSelectedId(first.id);
          void refreshStudent(first.id);
        }
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const refreshStudent = useCallback(async (id: number) => {
    const [profile, reqs] = await Promise.all([api.getStudent(id), api.requests(id)]);
    setStudent(profile);
    setRequests(reqs);
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    void refreshStudent(selectedId).catch((e) => setError((e as Error).message));
    setMatches(null);
    setCycles([]);
  }, [selectedId, refreshStudent]);

  const selectStudent = (id: number) => setSelectedId(id);

  const loadResults = useCallback(async (id: number) => {
    const [m, c] = await Promise.all([api.matches(id), api.cycles(id)]);
    setMatches(m.matches);
    setCycles(c.cycles);
  }, []);

  const findMatches = async () => {
    if (selectedId === null) return;
    setLoading(true);
    setError(null);
    try {
      await loadResults(selectedId);
      setTab("exchanges");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshRequests = async () => {
    if (selectedId === null) return;
    const reqs = await api.requests(selectedId);
    setRequests(reqs);
  };

  const sendExchange = async (match: Match) => {
    if (!student) return;
    const teachSkill = student.skills.find((s) => s.direction === "teach");
    const give = match.give[0];
    const learnSkill = student.skills.find(
      (s) => s.direction === "learn" && s.name === give?.name,
    );
    if (!teachSkill || !learnSkill || !give) {
      setError("Exchange needs a teach skill and a learn skill.");
      return;
    }
    try {
      await api.sendRequest(student.id, match.peer.id, teachSkill.id, learnSkill.id);
      setToast(`Exchange request sent to ${match.peer.name}`);
      await refreshStudent(student.id);
      await refreshRequests();
      await loadResults(student.id);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const decide = async (id: number, action: "accept" | "reject" | "complete") => {
    try {
      const r = await api.decide(id, action);
      setToast(
        action === "accept"
          ? `Exchange accepted with ${r.receiver_name}`
          : action === "complete"
            ? `Exchange completed with ${r.receiver_name}`
            : `Request to ${r.receiver_name} declined`,
      );
      await refreshRequests();
      await refreshStudent(selectedId!);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const incoming = useMemo(
    () => (requests?.requests ?? []).filter((r) => r.receiver_id === selectedId),
    [requests, selectedId],
  );
  const outgoing = useMemo(
    () => (requests?.requests ?? []).filter((r) => r.sender_id === selectedId),
    [requests, selectedId],
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">⇄</span>
          <div>
            <h1>SkillSwap</h1>
            <p>skill exchange, not a directory</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="badge">{students.length} students online</span>
          <button className="btn primary" onClick={() => setShowNew(true)}>
            + Add yourself
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          Unable to reach the SkillSwap engine —{" "}
          <strong>{error}</strong>. Start the backend with: uvicorn app.main:app --port 8000 in /backend.
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <h2>Students</h2>
          <div className="student-list">
            {students.map((s) => (
              <button
                key={s.id}
                className={`student-card ${s.id === selectedId ? "active" : ""}`}
                onClick={() => selectStudent(s.id)}
              >
                <div className="avatar">{s.name.charAt(0)}</div>
                <div>
                  <strong>{s.name}</strong>
                  <span>{s.college}</span>
                  <small>
                    teaches {s.teach_count} · learns {s.learn_count}
                  </small>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="content">
          {student && (
            <div className="profile">
              <div className="profile-head">
                <div>
                  <h2>{student.name}</h2>
                  <p>{student.college}</p>
                  <p className="bio">{student.bio || "No bio."}</p>
                </div>
                <button className="btn primary big" onClick={findMatches} disabled={loading}>
                  {loading ? "Matching…" : "Find my exchanges"}
                </button>
              </div>

              <div className="chips">
                <div className="chip-group">
                  <h3>I can teach</h3>
                  <div className="chip-row">
                    {student.skills.filter((s) => s.direction === "teach").map((s) => (
                      <span key={s.id} className="chip teach">
                        {s.name} <em>{s.level}</em>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="chip-group">
                  <h3>I want to learn</h3>
                  <div className="chip-row">
                    {student.skills.filter((s) => s.direction === "learn").map((s) => (
                      <span key={s.id} className="chip learn">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <nav className="tabs">
            <button className={tab === "exchanges" ? "active" : ""} onClick={() => setTab("exchanges")}>
              Exchanges
            </button>
            <button className={tab === "inbox" ? "active" : ""} onClick={() => setTab("inbox")}>
              Inbox {incoming.filter((r) => r.status === "pending").length > 0 && (
                <span className="pill">{incoming.filter((r) => r.status === "pending").length}</span>
              )}
            </button>
          </nav>

          {tab === "exchanges" && (
            <Exchanges matches={matches} cycles={cycles} onRequest={sendExchange} />
          )}
          {tab === "inbox" && (
            <Inbox meId={selectedId} incoming={incoming} outgoing={outgoing} onDecide={decide} />
          )}
        </section>
      </main>

      {showNew && (
        <NewStudentModal
          onClose={() => setShowNew(false)}
          onCreated={(s) => {
            setShowNew(false);
            setStudents((prev) => [...prev, s]);
            setSelectedId(s.id);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Exchanges({
  matches,
  cycles,
  onRequest,
}: {
  matches: Match[] | null;
  cycles: Cycle[];
  onRequest: (m: Match) => void;
}) {
  if (matches === null) {
    return (
      <div className="empty-state">
        <span className="big-icon">⇄</span>
        <h3>Declare what you teach and learn, then press “Find my exchanges”.</h3>
        <p>SkillSwap maps the skill network and surfaces the people you can swap with.</p>
      </div>
    );
  }
  if (matches.length === 0) {
    return (
      <div className="empty-state">
        <span className="big-icon">•</span>
        <h3>No direct exchanges yet on this network.</h3>
        <p>
          Nobody on the platform currently teaches what you want to learn. Add more skills —
          or check exchange chains below.
        </p>
      </div>
    );
  }

  const mutual = matches.filter((m) => m.type === "MUTUAL");
  const relevant = matches.filter((m) => m.type === "RELEVANT");

  return (
    <div className="results">
      <div className="summary-bar">
        <strong>{mutual.length} mutual swaps</strong> · {relevant.length} relevant mentors found
      </div>

      {mutual.length > 0 && (
        <section>
          <h3 className="section-title">
            <span className="star">★</span> Mutual swaps — perfect 2-way exchange
          </h3>
          {mutual.map((m) => (
            <MatchCard key={m.peer.id} match={m} onRequest={onRequest} mutual />
          ))}
        </section>
      )}

      {relevant.length > 0 && (
        <section>
          <h3 className="section-title">○ Relevant mentors</h3>
          {relevant.map((m) => (
            <MatchCard key={m.peer.id} match={m} onRequest={onRequest} />
          ))}
        </section>
      )}

      {cycles.length > 0 && (
        <section>
          <h3 className="section-title">
            <span className="chain">⇄⇄</span> Exchange chains (no direct swap — 3-person cycle)
          </h3>
          {cycles.map((c, i) => (
            <div className="cycle-card" key={i}>
              {c.exchange.map((e, j) => (
                <div className="cycle-step" key={j}>
                  <div>
                    <strong>{e.from}</strong>{" "}
                    {e.from === "You" ? "give" : "gives"} <em>{e.skill}</em> to{" "}
                    <strong>{e.to}</strong>
                  </div>
                  {j < c.exchange.length - 1 && <span className="cycle-arrow">↓</span>}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function MatchCard({
  match: m,
  onRequest,
  mutual,
}: {
  match: Match;
  onRequest: (m: Match) => void;
  mutual?: boolean;
}) {
  const state = m.request?.status;
  return (
    <div className={`match-card ${mutual ? "swap" : ""}`}>
      <div className="match-head">
        <div>
          <strong>{m.peer.name}</strong>
          <span>{m.peer.college}</span>
        </div>
        {state === "accepted" && <span className="status accepted">Connected ✓</span>}
        {state === "pending" && <span className="status pending">Request sent</span>}
        {!state && m.connected && <span className="status accepted">Connected ✓</span>}
      </div>

      <div className="exchange-box">
        {m.give[0] && (
          <div className="row">
            <span className="who they">They teach</span>
            <span className="skill">{m.give[0].name}</span>
            <span className="who you">→ you learn</span>
          </div>
        )}
        {m.get[0] && (
          <div className="row">
            <span className="who you">You teach</span>
            <span className="skill">{m.get[0].name}</span>
            <span className="who they">→ they learn</span>
          </div>
        )}
      </div>

      <div className="checks">
        {m.checks.map((c) => (
          <span key={c}>✓ {c}</span>
        ))}
      </div>

      <div className="match-actions">
        {!state && (
          <button className="btn primary" onClick={() => onRequest(m)}>
            Request exchange
          </button>
        )}
        {state === "pending" && (
          <button className="btn ghost" disabled>
            Waiting for reply…
          </button>
        )}
      </div>
    </div>
  );
}

function Inbox({
  meId,
  incoming,
  outgoing,
  onDecide,
}: {
  meId: number | null;
  incoming: ExchangeRequest[];
  outgoing: ExchangeRequest[];
  onDecide: (id: number, action: "accept" | "reject" | "complete") => void;
}) {
  const pendingIn = incoming.filter((r) => r.status === "pending");
  const pendingOut = outgoing.filter((r) => r.status === "pending");
  const activeIn = incoming.filter((r) => r.status === "accepted");
  const activeOut = outgoing.filter((r) => r.status === "accepted");
  const done = incoming.filter((r) => r.status === "completed").concat(
    outgoing.filter((r) => r.status === "completed"),
  );

  const active = [...activeIn, ...activeOut];

  return (
    <div className="inbox">
      <section>
        <h3 className="section-title">Incoming requests</h3>
        {pendingIn.length === 0 && <p className="muted">Nothing waiting for you.</p>}
        {pendingIn.map((r) => (
          <div className="req-card" key={r.id}>
            <p>
              <strong>{r.sender_name}</strong> wants to teach you <em>{r.teach_skill}</em> and learn{" "}
              <em>{r.learn_skill}</em> from you.
            </p>
            <div className="req-actions">
              <button className="btn success" onClick={() => onDecide(r.id, "accept")}>
                Accept exchange
              </button>
              <button className="btn ghost" onClick={() => onDecide(r.id, "reject")}>
                Decline
              </button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h3 className="section-title">Outgoing requests</h3>
        {pendingOut.length === 0 && <p className="muted">Nothing you sent is waiting.</p>}
        {pendingOut.map((r) => (
          <div className="req-card" key={r.id}>
            <p>
              You asked <strong>{r.receiver_name}</strong> to teach you <em>{r.learn_skill}</em> in
              exchange for <em>{r.teach_skill}</em>. Awaiting their reply.
            </p>
            <div className="req-actions">
              <button className="btn ghost" disabled>
                Waiting for reply…
              </button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h3 className="section-title">Active exchanges</h3>
        {active.length === 0 && <p className="muted">Accept incoming requests to start an exchange.</p>}
        {active.map((r) =>
          r.receiver_id === meId ? (
            <div className="req-card active" key={r.id}>
              <p>
                <strong>{r.sender_name}</strong> teaches you <em>{r.teach_skill}</em> and learns{" "}
                <em>{r.learn_skill}</em> from you.
              </p>
              <div className="req-actions">
                <button className="btn primary" onClick={() => onDecide(r.id, "complete")}>
                  Mark exchange completed
                </button>
              </div>
            </div>
          ) : (
            <div className="req-card active" key={r.id}>
              <p>
                You teach <strong>{r.receiver_name}</strong> <em>{r.teach_skill}</em> and learn{" "}
                <em>{r.learn_skill}</em> from each other.
              </p>
              <div className="req-actions">
                <button className="btn primary" onClick={() => onDecide(r.id, "complete")}>
                  Mark exchange completed
                </button>
              </div>
            </div>
          ),
        )}
      </section>

      <section>
        <h3 className="section-title">Completed</h3>
        {done.length === 0 && <p className="muted">No completed exchanges yet.</p>}
        {done.map((r) =>
          r.receiver_id === meId ? (
            <div className="req-card done" key={r.id}>
              <p>
                ✓ <strong>{r.sender_name}</strong> taught you <em>{r.teach_skill}</em> and you taught
                them <em>{r.learn_skill}</em>.
              </p>
            </div>
          ) : (
            <div className="req-card done" key={r.id}>
              <p>
                ✓ You taught <strong>{r.receiver_name}</strong> <em>{r.teach_skill}</em> and learned{" "}
                <em>{r.learn_skill}</em> from them.
              </p>
            </div>
          ),
        )}
      </section>
    </div>
  );
}

function NewStudentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (s: StudentSummary) => void;
}) {
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [bio, setBio] = useState("");
  const [teachSkills, setTeachSkills] = useState<string[]>(["", ""]);
  const [learnSkills, setLearnSkills] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !college.trim()) {
      setErr("Name and college are required.");
      return;
    }
    const skills = [
      ...teachSkills.filter((s) => s.trim()).map((s) => ({
        name: s.trim(),
        category: "other",
        direction: "teach" as const,
        level: "intermediate",
      })),
      ...learnSkills.filter((s) => s.trim()).map((s) => ({
        name: s.trim(),
        category: "other",
        direction: "learn" as const,
        level: "intermediate",
      })),
    ];
    if (skills.length === 0) {
      setErr("Add at least one skill you teach or want to learn.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const created = await api.createStudent({ name, college, bio, skills });
      onCreated(created);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const SkillInput = ({
    label,
    values,
    onChange,
  }: {
    label: string;
    values: string[];
    onChange: (v: string[]) => void;
  }) => (
    <div className="field">
      <label>{label}</label>
      {values.map((v, i) => (
        <input
          key={i}
          list="skill-suggestions"
          value={v}
          placeholder="e.g. Python"
          onChange={(e) => {
            const next = [...values];
            next[i] = e.target.value;
            onChange(next);
            if (i === values.length - 1 && e.target.value.trim()) onChange([...next, ""]);
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Add yourself</h2>
        <p className="muted">Declare what you can teach and what you want to learn.</p>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="College" value={college} onChange={(e) => setCollege(e.target.value)} />
        <textarea placeholder="One-line bio" value={bio} onChange={(e) => setBio(e.target.value)} />

        <SkillInput label="I can teach" values={teachSkills} onChange={setTeachSkills} />
        <SkillInput label="I want to learn" values={learnSkills} onChange={setLearnSkills} />

        <datalist id="skill-suggestions">
          {DEFAULTSKILLS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        {err && <p className="error-text">{err}</p>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create profile"}
          </button>
        </div>
      </div>
    </div>
  );
}