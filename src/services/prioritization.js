const { DateTime } = require("luxon");
const { SESSION_PRIORITY } = require("../config");

function scoreEvent(event) {
  const start = DateTime.fromISO(event.start_time_utc, { zone: "utc" });
  const minutesToStart = Math.max(
    0,
    Math.floor(start.diffNow("minutes").minutes || 0)
  );

  let score = 0;

  if (event.status === "live") score += 10_000;
  if (event.status === "upcoming") score += 5_000;
  if (event.is_major_event) score += 1_500;

  score += (SESSION_PRIORITY[event.session_type] || 0) * 100;
  score += Math.max(0, 240 - minutesToStart);

  return score;
}

function prioritize(events) {
  return [...events]
    .map((event) => ({ ...event, priority: scoreEvent(event) }))
    .sort((a, b) => b.priority - a.priority);
}

module.exports = {
  prioritize,
};
