const { DateTime } = require("luxon");
const { MAJOR_EVENTS } = require("../config");

function computeStatus(startTimeUtc, endTimeUtc) {
  const now = DateTime.utc();
  const start = DateTime.fromISO(startTimeUtc, { zone: "utc" });
  const end = DateTime.fromISO(endTimeUtc, { zone: "utc" });

  if (!start.isValid || !end.isValid) return "unknown";
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "finished";
}

function normalizeEvent(raw) {
  const source = String(raw.source || "unknown").toLowerCase();
  const confidence = raw.confidence
    ? Math.max(0, Math.min(1, Number(raw.confidence)))
    : source === "openf1"
    ? 0.92
    : source === "ical"
    ? 0.82
    : source.startsWith("mock")
    ? 0.45
    : 0.6;

  return {
    series: String(raw.series || "").toUpperCase(),
    event_id: raw.event_id,
    event_name: raw.event_name,
    session_type: String(raw.session_type || "").toLowerCase(),
    start_time_utc: raw.start_time_utc,
    end_time_utc: raw.end_time_utc,
    status: computeStatus(raw.start_time_utc, raw.end_time_utc),
    circuit: raw.circuit || null,
    country: raw.country || null,
    priority: 0,
    pole: raw.pole ?? null,
    winner: raw.winner ?? null,
    source,
    confidence,
    is_major_event:
      Boolean(raw.is_major_event) ||
      MAJOR_EVENTS.some((name) => raw.event_name?.includes(name)),
  };
}

function dedupeBySession(events) {
  const map = new Map();
  for (const event of events) {
    const key = [
      event.series,
      event.event_id,
      event.session_type,
      event.start_time_utc,
    ].join("|");
    map.set(key, event);
  }
  return Array.from(map.values());
}

function aggregateEvents(rawEvents) {
  return dedupeBySession(rawEvents.map(normalizeEvent));
}

module.exports = {
  aggregateEvents,
};
