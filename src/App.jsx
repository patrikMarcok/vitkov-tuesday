import { useEffect, useMemo, useState } from "react";
import { PLAYERS, SERIES, IS_FIREBASE_CONFIGURED } from "./config";
import { generateSessions, groupByMonth } from "./sessions";
import { subscribeAttendance, setOut } from "./firebase";
import "./App.css";

const ME_KEY = "training-schedule:me";
const PLAYERS_KEY = "training-schedule:players";
const SUBS_KEY = "training-schedule:subs";

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function seasonLabel() {
  const first = SERIES[0];
  if (!first) return "";
  const fmt = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(first.seasonStart)} – ${fmt(first.seasonEnd)}`;
}

export default function App() {
  const sessions = useMemo(() => generateSessions(), []);
  const grouped = useMemo(() => groupByMonth(sessions), [sessions]);

  const [attendance, setAttendance] = useState({});
  const [players, setPlayers] = useState(() => readStorage(PLAYERS_KEY, PLAYERS));
  const [substitutes, setSubstitutes] = useState(() => readStorage(SUBS_KEY, {}));
  const [me, setMe] = useState(() => localStorage.getItem(ME_KEY) || "");
  const [pickerOpen, setPickerOpen] = useState(!me);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  useEffect(() => {
    let unsub;
    subscribeAttendance((data) => setAttendance(data)).then((fn) => {
      unsub = fn;
    });
    return () => unsub && unsub();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextSession = sessions.find((s) => s.date >= today);

  function choosePlayer(id) {
    localStorage.setItem(ME_KEY, id);
    setMe(id);
    setPickerOpen(false);
  }

  function chooseGuest() {
    localStorage.setItem(ME_KEY, "");
    setMe("");
    setPickerOpen(false);
  }

  function savePlayers(nextPlayers) {
    setPlayers(nextPlayers);
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(nextPlayers));
  }

  function addPlayer(event) {
    event.preventDefault();
    const name = newPlayer.trim();
    if (players.length >= 4 || !name || players.some((player) => player.name.toLowerCase() === name.toLowerCase())) return;
    savePlayers([...players, { id: `player-${players.length + 1}`, name }]);
    setNewPlayer("");
  }

  function renamePlayer(id, name) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    savePlayers(players.map((player) => (player.id === id ? { ...player, name: trimmedName } : player)));
  }

  function addSubstitute(sessionKey, name) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const session = sessions.find((item) => item.key === sessionKey);
    const outCount = Object.keys(attendance[session?.dateKey] || {}).filter((id) => attendance[session?.dateKey][id]).length;
    const confirmedCount = players.length - outCount + (substitutes[sessionKey] || []).length;
    if (confirmedCount >= 4) return;
    const next = { ...substitutes, [sessionKey]: [...(substitutes[sessionKey] || []), { id: `sub-${(substitutes[sessionKey] || []).length + 1}`, name: trimmedName }] };
    setSubstitutes(next);
    localStorage.setItem(SUBS_KEY, JSON.stringify(next));
  }

  function removeSubstitute(sessionKey, subId) {
    const next = { ...substitutes, [sessionKey]: (substitutes[sessionKey] || []).filter((sub) => sub.id !== subId) };
    setSubstitutes(next);
    localStorage.setItem(SUBS_KEY, JSON.stringify(next));
  }

  async function toggle(session, playerId) {
    if (playerId !== me) return;
    const isOut = Boolean(attendance[session.dateKey]?.[playerId]);
    setAttendanceError("");
    try {
      await setOut(session.dateKey, playerId, !isOut);
    } catch {
      setAttendanceError("Attendance could not be saved. Check your Firestore rules, then try again.");
    }
  }

  const meName = players.find((p) => p.id === me)?.name;
  const completedSessions = sessions.filter((session) => session.date < today);
  const playerStats = players.map((player) => {
    const missed = completedSessions.filter((session) => attendance[session.dateKey]?.[player.id]).length;
    return { ...player, attended: completedSessions.length - missed, missed };
  });

  return (
    <>
      <header className="hero">
        <p className="hero-eyebrow">Training schedule</p>
        <h1 className="hero-title">
          Tuesdays <span className="accent">19:00–20:30</span>
        </h1>
        <div className="hero-meta">
          <div className="hero-meta-item">
            Season
            <strong>{seasonLabel()}</strong>
          </div>
          {nextSession && (
            <div className="hero-meta-item">
              Next session
              <strong>
                {nextSession.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </strong>
            </div>
          )}
          <button className="settings-button" onClick={() => setSettingsOpen(true)}>Players</button>
        </div>
      </header>

      {!IS_FIREBASE_CONFIGURED && (
        <p className="demo-banner">
          Demo mode: no database is connected yet, so ticks only save in
          this browser. See README.md to connect a free Firebase project so
          everyone sees the same schedule.
        </p>
      )}

      {attendanceError && <p className="error-banner">{attendanceError}</p>}

      {me && (
        <div className="whoami">
          <span className="whoami-label">
            You're marking attendance as{" "}
            <span className="whoami-name">{meName}</span>
          </span>
          <button className="whoami-switch" onClick={() => setPickerOpen(true)}>
            switch
          </button>
        </div>
      )}
      {!me && !pickerOpen && (
        <div className="whoami">
          <span className="whoami-label">Choose your name to mark attendance</span>
          <button className="whoami-switch" onClick={() => setPickerOpen(true)}>
            I'm a player
          </button>
        </div>
      )}

      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot in" /> confirmed
        </span>
        <span className="legend-item">
          <span className="legend-dot out" /> can't make it
        </span>
        <span className="legend-item">tap your own circle to toggle</span>
      </div>

      <div className="past-toggle-row">
        <span>{showPast ? "Showing past trainings" : "Past trainings are hidden"}</span>
        <button className="past-toggle" onClick={() => setShowPast((value) => !value)}>
          {showPast ? "Hide past" : "Show past"}
        </button>
      </div>

      {grouped.map((group) => (
        (() => {
          const visibleSessions = group.sessions.filter((session) => showPast || session.date >= today);
          if (!visibleSessions.length) return null;
          return <div className="month-group" key={group.monthKey}>
          <h2 className="month-label">{group.label}</h2>
          <div className="session-list">
            {visibleSessions.map((session) => {
              const outIds = Object.keys(
                attendance[session.dateKey] || {}
              ).filter((id) => attendance[session.dateKey][id]);
              const availableCount = players.length - outIds.length;
              const sessionSubs = substitutes[session.key] || [];
              const participantCount = availableCount + sessionSubs.length;

              return (
                <div
                  className={
                    "session-card" +
                    (nextSession && session.key === nextSession.key
                      ? " is-next"
                      : "") +
                    (session.date < today ? " is-past" : "")
                  }
                  key={session.key}
                >
                  <div className="session-date">
                    <span className="day-num">{session.date.getDate()}</span>
                    <span className="day-name">
                      {session.date.toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </span>
                  </div>
                  <div className="session-info">
                    <p className="session-time">
                      {session.startTime}–{session.endTime} · {session.label}
                    </p>
                    <p
                      className={
                        "session-status" +
                        (participantCount < 4 ? " short" : "")
                      }
                    >
                      {participantCount}/4 attending
                    </p>
                  </div>
                  <div className="chips">
                    {players.map((p) => {
                      const isOut = outIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          className={
                            "chip " +
                            (isOut ? "out" : "in") +
                            (p.id === me ? " is-you" : "")
                          }
                          title={p.name + (isOut ? " — can't make it" : " — in")}
                          onClick={() => (me ? toggle(session, p.id) : setPickerOpen(true))}
                          disabled={Boolean(me) && p.id !== me}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </button>
                      );
                    })}
                    {sessionSubs.map((sub) => (
                      <button key={sub.id} className="chip substitute" title={`${sub.name} — substitute`} onClick={() => removeSubstitute(session.key, sub.id)}>
                        {sub.name.slice(0, 2).toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {sessionSubs.length > 0 && <p className="sub-list">Joining: {sessionSubs.map((sub) => sub.name).join(", ")}</p>}
                  <SubstituteForm disabled={participantCount >= 4} onAdd={(name) => addSubstitute(session.key, name)} />
                </div>
              );
            })}
          </div>
        </div>;
        })()
      ))}

      <p className="footer-note">
        Substitute names and player settings are saved in this browser. Attendance is shared when Firebase is connected.
      </p>

      <section className="stats-section">
        <div className="section-heading">
          <div><p className="section-kicker">The season so far</p><h2>Attendance</h2></div>
          <span className="stats-total">{completedSessions.length} completed</span>
        </div>
        <div className="stats-list">
          {playerStats.map((player) => {
            const percentage = completedSessions.length ? Math.round((player.attended / completedSessions.length) * 100) : 0;
            return <div className="stat-row" key={player.id}><span>{player.name}</span><div className="stat-bar"><i style={{ width: `${percentage}%` }} /></div><strong>{percentage}%</strong><small>{player.missed} missed</small></div>;
          })}
        </div>
      </section>

      {pickerOpen && (
        <div className="picker-backdrop" onClick={() => me && setPickerOpen(false)}>
          <div className="picker-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="picker-title">Who are you?</h2>
            <p className="picker-sub">
              Pick your name so you can mark yourself out — you'll only be
              able to change your own attendance.
            </p>
            <div className="picker-grid">
              {players.map((p) => (
                <button
                  key={p.id}
                  className="picker-btn"
                  onClick={() => choosePlayer(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <button className="picker-guest" onClick={chooseGuest}>
              Just viewing, thanks
            </button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="picker-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="picker-card settings-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSettingsOpen(false)} aria-label="Close">×</button>
            <p className="section-kicker">Roster</p>
            <h2 className="picker-title">Player settings</h2>
            <p className="picker-sub">Names are stored on this device. Adding a player creates a new attendance identity.</p>
            <div className="roster-list">
              {players.map((player) => <label key={player.id}><span>{player.name}</span><input defaultValue={player.name} onBlur={(event) => renamePlayer(player.id, event.target.value)} /></label>)}
            </div>
            <form className="add-player" onSubmit={addPlayer}><input value={newPlayer} onChange={(event) => setNewPlayer(event.target.value)} placeholder={players.length >= 4 ? "Roster is full" : "New player name"} aria-label="New player name" disabled={players.length >= 4} /><button type="submit" disabled={players.length >= 4}>Add player</button></form>
          </div>
        </div>
      )}
    </>
  );
}

function SubstituteForm({ onAdd, disabled }) {
  const [name, setName] = useState("");
  function submit(event) {
    event.preventDefault();
    onAdd(name);
    setName("");
  }
  return <form className="sub-form" onSubmit={submit}><input value={name} onChange={(event) => setName(event.target.value)} placeholder={disabled ? "Training is full" : "Add substitute"} aria-label="Substitute name" disabled={disabled} /><button type="submit" disabled={disabled}>+</button></form>;
}
