export default function AttendanceStats({ completedCount, playerStats }) {
  return (
    <section className="stats-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">The season so far</p>
          <h2>Attendance</h2>
        </div>
        <span className="stats-total">{completedCount} completed</span>
      </div>
      <div className="stats-list">
        {playerStats.map((player) => {
          const percentage = completedCount
            ? Math.round((player.attended / completedCount) * 100)
            : 0;
          return (
            <div className="stat-row" key={player.id}>
              <span>{player.name}</span>
              <div className="stat-bar"><i style={{ width: `${percentage}%` }} /></div>
              <strong>{percentage}%</strong>
              <small>{player.attended} attended · {player.missed} missed</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}