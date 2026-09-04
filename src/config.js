// ── EDIT ME ──────────────────────────────────────────────────────────────
// Everything you're likely to want to change lives in this file.

// The people on the roster. `id` must never change once games have been
// recorded (it's the key used in the database) — safe to change `name`
// any time, e.g. when someone gets replaced.
export const PLAYERS = [
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" },
  { id: "p3", name: "Player 3" },
  { id: "p4", name: "Player 4" },
];

// One entry per weekly recurring slot. Add a second object here any time
// you want another weekly session (e.g. a Saturday morning slot) — the
// schedule below will merge and sort them automatically.
export const SERIES = [
  {
    id: "tuesday-evening",
    label: "Weekly training",
    dayOfWeek: 2, // 0 = Sunday, 1 = Monday, 2 = Tuesday ...
    startTime: "19:00",
    endTime: "20:30",
    seasonStart: "2026-09-22",
    seasonEnd: "2027-05-15",
  },
];

// Dates to skip within a series' season (holidays, court closures, etc).
// Format: "YYYY-MM-DD". Leave empty and just delete sessions manually in
// the app if that's easier — this is just a convenience.
export const EXCLUDED_DATES = [
  // "2026-12-22",
  // "2026-12-29",
];

// ── Firebase ─────────────────────────────────────────────────────────────
// See README.md for how to create a free Firebase project and fill this
// in. Until you do, the app runs in local-only demo mode (attendance is
// stored in your browser only and won't sync between players).
export const firebaseConfig = {
  apiKey: "AIzaSyCFKeOz3kFVw5CqwRDApwwhm6aAKJOsmeU",
  authDomain: "vitkov-tuesday.firebaseapp.com",
  projectId: "vitkov-tuesday",
  storageBucket: "vitkov-tuesday.firebasestorage.app",
  messagingSenderId: "795839312344",
  appId: "1:795839312344:web:b4897e1be6673708b482ad"
};

export const IS_FIREBASE_CONFIGURED = Boolean(firebaseConfig.projectId);
