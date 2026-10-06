import { SERIES } from "../config";

export function seasonLabel() {
  const first = SERIES[0];
  if (!first) return "";

  const formatDate = (isoDate) => new Date(isoDate).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${formatDate(first.seasonStart)} – ${formatDate(first.seasonEnd)}`;
}

export function formatKc(amount) {
  return `${amount.toLocaleString("cs-CZ")} Kč`;
}