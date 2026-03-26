const { DateTime } = require("luxon");
const { ENABLE_NOTIFICATIONS } = require("../config");
const { setIfNotExists, listPushTrim, listRange } = require("./stateStore");

const RECENT_KEY = "notif:recent";
const RECENT_LIMIT = 200;
const DEDUP_TTL_SECONDS = 24 * 60 * 60;

async function notify(key, text, icon = "i123") {
  const lockAcquired = await setIfNotExists(`notif:dedup:${key}`, "1", DEDUP_TTL_SECONDS);
  if (!lockAcquired) return null;
  const payload = {
    created_at_utc: new Date().toISOString(),
    key,
    frames: [{ text, icon }],
  };
  await listPushTrim(RECENT_KEY, JSON.stringify(payload), RECENT_LIMIT);
  return payload;
}

async function checkEvents(events) {
  if (!ENABLE_NOTIFICATIONS) return [];

  const now = DateTime.utc();
  const out = [];

  for (const event of events) {
    const start = DateTime.fromISO(event.start_time_utc, { zone: "utc" });
    const end = DateTime.fromISO(event.end_time_utc, { zone: "utc" });
    if (!start.isValid || !end.isValid) continue;

    const minutesToStart = start.diff(now, "minutes").minutes;
    const minutesSinceStart = now.diff(start, "minutes").minutes;
    const minutesSinceEnd = now.diff(end, "minutes").minutes;
    const shortSeries = String(event.series || "").toUpperCase();
    const shortType = String(event.session_type || "").toUpperCase().slice(0, 5);

    if (minutesToStart > 0 && minutesToStart <= 10) {
      const item = await notify(
        `t10:${event.event_id}:${event.session_type}:${start.toISO()}`,
        `${shortSeries} ${shortType} T-10`,
        "i25731"
      );
      if (item) out.push(item);
    }

    if (minutesSinceStart >= 0 && minutesSinceStart <= 5) {
      const item = await notify(
        `start:${event.event_id}:${event.session_type}:${start.toISO()}`,
        `${shortSeries} ${shortType} START`,
        "i25731"
      );
      if (item) out.push(item);
    }

    if (event.session_type === "qualifying" && event.pole && minutesSinceEnd >= 0 && minutesSinceEnd <= 30) {
      const item = await notify(
        `pole:${event.event_id}:${event.session_type}:${end.toISO()}`,
        `POLE: ${event.pole}`,
        "i123"
      );
      if (item) out.push(item);
    }

    if (event.session_type === "race" && event.winner && minutesSinceEnd >= 0 && minutesSinceEnd <= 30) {
      const item = await notify(
        `winner:${event.event_id}:${event.session_type}:${end.toISO()}`,
        `WIN: ${event.winner}`,
        "i123"
      );
      if (item) out.push(item);
    }
  }

  return out;
}

async function getRecent(limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const rows = await listRange(RECENT_KEY, 0, safeLimit - 1);
  return rows
    .map((row) => {
      try {
        return JSON.parse(row);
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = {
  checkEvents,
  getRecent,
};
