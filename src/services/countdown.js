const { DateTime } = require("luxon");

function formatCountdownOrSchedule(startTimeUtc, tz) {
  const now = DateTime.utc();
  const startUtc = DateTime.fromISO(startTimeUtc, { zone: "utc" });
  const diffMs = startUtc.toMillis() - now.toMillis();

  if (diffMs <= 0) return "NOW";

  const minutesTotal = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;

  if (minutesTotal < 60) {
    return `${minutesTotal}M`;
  }

  if (minutesTotal < 24 * 60) {
    return `${hours}H ${minutes}M`;
  }

  const localStart = startUtc.setZone(tz);
  return localStart.toFormat("ccc HH:mm").toUpperCase();
}

module.exports = {
  formatCountdownOrSchedule,
};
