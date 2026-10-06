export default function FinancePanel({
  totalBuffer,
  playerStats,
  absenceFee,
  feeInput,
  financeSaved,
  onFeeChange,
  onSaveFee,
  formatKc,
}) {
  return (
    <section className="finance-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Completed absences</p>
          <h2>Team buffer</h2>
        </div>
        <strong className="finance-total">{formatKc(totalBuffer)}</strong>
      </div>
      <form className="fee-form" onSubmit={onSaveFee}>
        <label htmlFor="absence-fee">Charge per missed training</label>
        <div className="fee-input-wrap">
          <input
            id="absence-fee"
            type="number"
            min="0"
            step="50"
            value={feeInput}
            onChange={onFeeChange}
          />
          <span>Kč</span>
        </div>
        <button type="submit">Save fee</button>
        {financeSaved && <span className="save-confirmation">Shared</span>}
      </form>
      <div className="finance-list">
        {playerStats.map((player) => (
          <div className="finance-row" key={player.id}>
            <span className="finance-player">{player.name}</span>
            <span className="finance-missed">{player.missed} missed × {formatKc(absenceFee)}</span>
            <strong>{formatKc(player.missed * absenceFee)}</strong>
          </div>
        ))}
      </div>
      <p className="finance-note">
        Only completed trainings count. Each marked absence adds the fee to that player’s buffer.
      </p>
    </section>
  );
}