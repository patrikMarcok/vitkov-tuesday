export const STORAGE_KEYS = {
  me: "training-schedule:me",
  players: "training-schedule:players",
  substitutes: "training-schedule:subs",
};

export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}