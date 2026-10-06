import { useEffect, useMemo, useState } from "react";
import { PLAYERS, IS_FIREBASE_CONFIGURED } from "./config";
import { generateSessions, groupByMonth } from "./lib/sessions";
import { readStorage, STORAGE_KEYS } from "./lib/storage";
import { formatKc, seasonLabel } from "./lib/formatters";
import {
  subscribeAttendance,
  subscribeRoster,
  saveRoster,
  subscribeFinance,
  saveAbsenceFee,
  setOut,
} from "./lib/firebase";
import SiteHeader from "./components/SiteHeader";
import TrainingSchedule from "./components/TrainingSchedule";
import AttendanceStats from "./components/AttendanceStats";
import FinancePanel from "./components/FinancePanel";
import { PlayerPicker, PlayerSettings } from "./components/PlayerDialogs";
import "./App.css";

const DEFAULT_ABSENCE_FEE = 300;

export default function App() {
  const sessions = useMemo(() => generateSessions(), []);
  const grouped = useMemo(() => groupByMonth(sessions), [sessions]);

  const [attendance, setAttendance] = useState({});
  const [players, setPlayers] = useState(() => readStorage(STORAGE_KEYS.players, PLAYERS));
  const [substitutes, setSubstitutes] = useState(() => readStorage(STORAGE_KEYS.substitutes, {}));
  const [me, setMe] = useState(() => localStorage.getItem(STORAGE_KEYS.me) || "");
  const [pickerOpen, setPickerOpen] = useState(!me);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [rosterSaved, setRosterSaved] = useState(false);
  const [absenceFee, setAbsenceFee] = useState(DEFAULT_ABSENCE_FEE);
  const [feeInput, setFeeInput] = useState(String(DEFAULT_ABSENCE_FEE));
  const [financeSaved, setFinanceSaved] = useState(false);

  useEffect(() => {
    let unsub;
    subscribeAttendance((data) => setAttendance(data)).then((fn) => {
      unsub = fn;
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    let unsub;
    subscribeFinance((fee) => {
      setAbsenceFee(fee);
      setFeeInput(String(fee));
    }).then((fn) => {
      unsub = fn;
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    let unsub;
    subscribeRoster((data) => {
      if (data?.length) {
        setPlayers(data);
        localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(data));
      } else {
        const localPlayers = readStorage(STORAGE_KEYS.players, PLAYERS);
        if (JSON.stringify(localPlayers) !== JSON.stringify(PLAYERS)) {
          saveRoster(localPlayers).catch(() => {
            setAttendanceError("Player names could not be shared. Check your Firestore rules, then try again.");
          });
        }
      }
    }).then((fn) => {
      unsub = fn;
    });
    return () => unsub && unsub();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextSession = sessions.find((s) => s.date >= today);

  function choosePlayer(id) {
    localStorage.setItem(STORAGE_KEYS.me, id);
    setMe(id);
    setPickerOpen(false);
  }

  function chooseGuest() {
    localStorage.setItem(STORAGE_KEYS.me, "");
    setMe("");
    setPickerOpen(false);
  }

  async function savePlayers(nextPlayers) {
    setPlayers(nextPlayers);
    localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(nextPlayers));
    setRosterSaved(false);
    try {
      await saveRoster(nextPlayers);
      setRosterSaved(true);
    } catch {
      setAttendanceError("Player names could not be shared. Check your Firestore rules, then try again.");
    }
  }

  async function saveFee(event) {
    event.preventDefault();
    const fee = Number(feeInput);
    if (!Number.isFinite(fee) || fee < 0) return;
    setAttendanceError("");
    try {
      await saveAbsenceFee(fee);
      setAbsenceFee(fee);
      setFinanceSaved(true);
    } catch {
      setAttendanceError("The absence fee could not be shared. Check your Firestore rules, then try again.");
    }
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
    localStorage.setItem(STORAGE_KEYS.substitutes, JSON.stringify(next));
  }

  function removeSubstitute(sessionKey, subId) {
    const next = { ...substitutes, [sessionKey]: (substitutes[sessionKey] || []).filter((sub) => sub.id !== subId) };
    setSubstitutes(next);
    localStorage.setItem(STORAGE_KEYS.substitutes, JSON.stringify(next));
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
  const previousSubstitutes = [...new Set(Object.values(substitutes).flat().map((substitute) => substitute.name))].sort();
  const playerStats = players.map((player) => {
    const missed = completedSessions.filter((session) => attendance[session.dateKey]?.[player.id]).length;
    return { ...player, attended: completedSessions.length - missed, missed };
  });
  const totalBuffer = playerStats.reduce((total, player) => total + player.missed * absenceFee, 0);

  return (
    <>
      <SiteHeader
        season={seasonLabel()}
        nextSession={nextSession}
        onOpenPlayers={() => setSettingsOpen(true)}
      />

      {!IS_FIREBASE_CONFIGURED && (
        <p className="demo-banner">
          Demo mode: no database is connected yet, so ticks only save in this browser.
          See README.md to connect a free Firebase project so everyone sees the same schedule.
        </p>
      )}
      {attendanceError && <p className="error-banner">{attendanceError}</p>}

      {me ? (
        <div className="whoami">
          <span className="whoami-label">
            You're marking attendance as <span className="whoami-name">{meName}</span>
          </span>
          <button className="whoami-switch" onClick={() => setPickerOpen(true)}>switch</button>
        </div>
      ) : !pickerOpen ? (
        <div className="whoami">
          <span className="whoami-label">Choose your name to mark attendance</span>
          <button className="whoami-switch" onClick={() => setPickerOpen(true)}>I'm a player</button>
        </div>
      ) : null}

      <div className="legend">
        <span className="legend-item"><span className="legend-dot in" /> confirmed</span>
        <span className="legend-item"><span className="legend-dot out" /> can't make it</span>
        <span className="legend-item">tap your own circle to toggle</span>
      </div>

      <div className="past-toggle-row">
        <span>{showPast ? "Showing past trainings" : "Past trainings are hidden"}</span>
        <button className="past-toggle" onClick={() => setShowPast((value) => !value)}>
          {showPast ? "Hide past" : "Show past"}
        </button>
      </div>

      <TrainingSchedule
        grouped={grouped}
        attendance={attendance}
        players={players}
        substitutes={substitutes}
        me={me}
        nextSession={nextSession}
        today={today}
        showPast={showPast}
        onChoosePlayer={() => setPickerOpen(true)}
        onToggle={toggle}
        onRemoveSubstitute={removeSubstitute}
        onAddSubstitute={addSubstitute}
        previousSubstitutes={previousSubstitutes}
      />

      <p className="footer-note">
        Substitute names and player settings are saved in this browser. Attendance is shared when Firebase is connected.
      </p>

      <AttendanceStats completedCount={completedSessions.length} playerStats={playerStats} />
      <FinancePanel
        totalBuffer={totalBuffer}
        playerStats={playerStats}
        absenceFee={absenceFee}
        feeInput={feeInput}
        financeSaved={financeSaved}
        onFeeChange={(event) => {
          setFeeInput(event.target.value);
          setFinanceSaved(false);
        }}
        onSaveFee={saveFee}
        formatKc={formatKc}
      />

      {pickerOpen && (
        <PlayerPicker
          players={players}
          onChoose={choosePlayer}
          onGuest={chooseGuest}
          onClose={() => me && setPickerOpen(false)}
        />
      )}
      {settingsOpen && (
        <PlayerSettings
          players={players}
          newPlayer={newPlayer}
          rosterSaved={rosterSaved}
          onClose={() => setSettingsOpen(false)}
          onRename={renamePlayer}
          onNewPlayerChange={(event) => setNewPlayer(event.target.value)}
          onAddPlayer={addPlayer}
        />
      )}
    </>
  );
}
