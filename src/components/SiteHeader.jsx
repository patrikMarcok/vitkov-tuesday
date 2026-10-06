export default function SiteHeader({ season, nextSession, onOpenPlayers }) {
  return (
    <header className="hero">
      <p className="hero-eyebrow">Training schedule</p>
      <h1 className="hero-title">
        Tuesdays <span className="accent">19:00–20:30</span>
      </h1>
      <div className="hero-meta">
        <div className="hero-meta-item">
          Season
          <strong>{season}</strong>
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
        <button className="settings-button" onClick={onOpenPlayers}>Players</button>
      </div>
    </header>
  );
}