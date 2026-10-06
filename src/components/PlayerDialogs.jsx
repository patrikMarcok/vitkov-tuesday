export function PlayerPicker({ players, onChoose, onGuest, onClose }) {
  return (
    <div className="picker-backdrop" onClick={onClose}>
      <div className="picker-card" onClick={(event) => event.stopPropagation()}>
        <h2 className="picker-title">Who are you?</h2>
        <p className="picker-sub">
          Pick your name so you can mark yourself out — you'll only be able to change your own attendance.
        </p>
        <div className="picker-grid">
          {players.map((player) => (
            <button key={player.id} className="picker-btn" onClick={() => onChoose(player.id)}>
              {player.name}
            </button>
          ))}
        </div>
        <button className="picker-guest" onClick={onGuest}>Just viewing, thanks</button>
      </div>
    </div>
  );
}

export function PlayerSettings({
  players,
  newPlayer,
  rosterSaved,
  onClose,
  onRename,
  onNewPlayerChange,
  onAddPlayer,
}) {
  return (
    <div className="picker-backdrop" onClick={onClose}>
      <div className="picker-card settings-card" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <p className="section-kicker">Roster</p>
        <h2 className="picker-title">Player settings</h2>
        <p className="picker-sub">
          Names are stored on this device. Adding a player creates a new attendance identity.
        </p>
        <div className="roster-list">
          {players.map((player) => (
            <label key={player.id}>
              <span>{player.name}</span>
              <input
                defaultValue={player.name}
                onBlur={(event) => onRename(player.id, event.target.value)}
              />
            </label>
          ))}
        </div>
        <form className="add-player" onSubmit={onAddPlayer}>
          <input
            value={newPlayer}
            onChange={onNewPlayerChange}
            placeholder={players.length >= 4 ? "Roster is full" : "New player name"}
            aria-label="New player name"
            disabled={players.length >= 4}
          />
          <button type="submit" disabled={players.length >= 4}>Add player</button>
        </form>
        {rosterSaved && <p className="save-confirmation">Names shared with everyone.</p>}
      </div>
    </div>
  );
}