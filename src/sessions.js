import { SERIES, EXCLUDED_DATES } from "./config";

const pad = (n) => String(n).padStart(2, "0");

export const toDateKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseLocalDate = (isoDate) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Builds the full list of sessions across every series in config.js,
// merged and sorted by date. Each session:
// { key, date, series, label, startTime, endTime }
export function generateSessions() {
  const sessions = [];

  for (const series of SERIES) {
    const start = parseLocalDate(series.seasonStart);
    const end = parseLocalDate(series.seasonEnd);

    // Move to the first occurrence of dayOfWeek on/after start
    const cursor = new Date(start);
    const offset = (series.dayOfWeek - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + offset);

    while (cursor <= end) {
      const key = toDateKey(cursor);
      if (!EXCLUDED_DATES.includes(key)) {
        sessions.push({
          key: `${series.id}__${key}`,
          dateKey: key,
          date: new Date(cursor),
          seriesId: series.id,
          label: series.label,
          startTime: series.startTime,
          endTime: series.endTime,
        });
      }
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  sessions.sort((a, b) => a.date - b.date);
  return sessions;
}

export function groupByMonth(sessions) {
  const groups = [];
  let current = null;
  for (const s of sessions) {
    const monthKey = `${s.date.getFullYear()}-${s.date.getMonth()}`;
    if (!current || current.monthKey !== monthKey) {
      current = {
        monthKey,
        label: s.date.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        sessions: [],
      };
      groups.push(current);
    }
    current.sessions.push(s);
  }
  return groups;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
