import { SERIES, EXCLUDED_DATES } from "../config";

const pad = (number) => String(number).padStart(2, "0");

export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseLocalDate = (isoDate) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export function generateSessions() {
  const sessions = [];

  for (const series of SERIES) {
    const start = parseLocalDate(series.seasonStart);
    const end = parseLocalDate(series.seasonEnd);
    const cursor = new Date(start);
    const offset = (series.dayOfWeek - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + offset);

    while (cursor <= end) {
      const dateKey = toDateKey(cursor);
      if (!EXCLUDED_DATES.includes(dateKey)) {
        sessions.push({
          key: `${series.id}__${dateKey}`,
          dateKey,
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

  sessions.sort((first, second) => first.date - second.date);
  return sessions;
}

export function groupByMonth(sessions) {
  const groups = [];
  let current = null;

  for (const session of sessions) {
    const monthKey = `${session.date.getFullYear()}-${session.date.getMonth()}`;
    if (!current || current.monthKey !== monthKey) {
      current = {
        monthKey,
        label: session.date.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        sessions: [],
      };
      groups.push(current);
    }
    current.sessions.push(session);
  }

  return groups;
}

export function isSameDay(first, second) {
  return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
}