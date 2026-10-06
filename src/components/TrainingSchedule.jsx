import { useState } from "react";

function SubstituteForm({ listId, onAdd, suggestions, disabled }) {
  const [name, setName] = useState("");

  function submit(event) {
    event.preventDefault();
    onAdd(name);
    setName("");
  }

  return (
    <form className="sub-form" onSubmit={submit}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        list={listId}
        placeholder={disabled ? "Training is full" : "Add substitute"}
        aria-label="Substitute name"
        disabled={disabled}
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
      </datalist>
      <button type="submit" disabled={disabled}>+</button>
    </form>
  );
}

export default function TrainingSchedule({
  grouped,
  attendance,
  players,
  substitutes,
  me,
  nextSession,
  today,
  showPast,
  onChoosePlayer,
  onToggle,
  onRemoveSubstitute,
  onAddSubstitute,
  previousSubstitutes,
}) {
  return grouped.map((group) => {
    const visibleSessions = group.sessions.filter((session) => showPast || session.date >= today);
    if (!visibleSessions.length) return null;

    return (
      <div className="month-group" key={group.monthKey}>
        <h2 className="month-label">{group.label}</h2>
        <div className="session-list">
          {visibleSessions.map((session) => {
            const outIds = Object.keys(attendance[session.dateKey] || {})
              .filter((id) => attendance[session.dateKey][id]);
            const availableCount = players.length - outIds.length;
            const sessionSubs = substitutes[session.key] || [];
            const participantCount = availableCount + sessionSubs.length;
            const isPast = session.date < today;

            return (
              <div
                className={
                  "session-card" +
                  (nextSession && session.key === nextSession.key ? " is-next" : "") +
                  (isPast ? " is-past" : "")
                }
                key={session.key}
              >
                <div className="session-date">
                  <span className="day-num">{session.date.getDate()}</span>
                  <span className="day-name">
                    {session.date.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                </div>
                <div className="session-info">
                  <p className="session-time">
                    {session.startTime}–{session.endTime} · {session.label}
                    {isPast && <span className="past-badge">Past · editable</span>}
                  </p>
                  <p className={"session-status" + (participantCount < 4 ? " short" : "")}>
                    {participantCount}/4 attending
                  </p>
                </div>
                <div className="session-attendance">
                  <div className="chips">
                    {players.map((player) => {
                      const isOut = outIds.includes(player.id);
                      return (
                        <button
                          key={player.id}
                          className={
                            "chip " + (isOut ? "out" : "in") + (player.id === me ? " is-you" : "")
                          }
                          title={player.name + (isOut ? " — can't make it" : " — in")}
                          onClick={() => (me ? onToggle(session, player.id) : onChoosePlayer())}
                          disabled={Boolean(me) && player.id !== me}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </button>
                      );
                    })}
                    {sessionSubs.map((substitute) => (
                      <button
                        key={substitute.id}
                        className="chip substitute"
                        title={`${substitute.name} — substitute`}
                        onClick={() => onRemoveSubstitute(session.key, substitute.id)}
                      >
                        {substitute.name.slice(0, 2).toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {sessionSubs.length > 0 && (
                    <p className="sub-list">Joining: {sessionSubs.map((substitute) => substitute.name).join(", ")}</p>
                  )}
                  <SubstituteForm
                    listId={`previous-substitutes-${session.key}`}
                    suggestions={previousSubstitutes}
                    disabled={participantCount >= 4}
                    onAdd={(name) => onAddSubstitute(session.key, name)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  });
}