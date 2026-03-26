const ical = require("node-ical");
const { DateTime } = require("luxon");
const { ICAL_ENABLED, DEFAULT_ICAL_FEEDS } = require("../config");

function parseFeedsFromEnv() {
  const raw = process.env.ICAL_FEEDS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        series: String(item.series || "").toUpperCase(),
        url: String(item.url || ""),
        keyword: item.keyword ? String(item.keyword).toLowerCase() : null,
      }))
      .filter((item) => item.series && item.url);
  } catch (_) {
    return [];
  }
}

function mergedFeeds() {
  const envFeeds = parseFeedsFromEnv();
  if (envFeeds.length === 0) return DEFAULT_ICAL_FEEDS;

  const index = new Map(
    DEFAULT_ICAL_FEEDS.map((feed) => [`${feed.series}:${feed.keyword || ""}`, feed])
  );
  envFeeds.forEach((feed) => {
    index.set(`${feed.series}:${feed.keyword || ""}`, feed);
  });
  return Array.from(index.values());
}

function inferSessionType(title) {
  const value = String(title || "").toLowerCase();
  if (value.includes("quali")) return "qualifying";
  if (value.includes("practice") || value.includes("fp")) return "practice";
  if (value.includes("race") || value.includes("sprint")) return "race";
  return "race";
}

function parseEventName(summary, fallbackSeries) {
  const [firstChunk] = String(summary || "").split(" - ");
  return firstChunk || `${fallbackSeries} Event`;
}

function mapIcalEvent(series, event) {
  const startUtc = DateTime.fromJSDate(event.start).toUTC().toISO();
  const endUtc = event.end
    ? DateTime.fromJSDate(event.end).toUTC().toISO()
    : DateTime.fromJSDate(event.start).plus({ hours: 2 }).toUTC().toISO();

  return {
    series,
    event_id: `${series.toLowerCase()}_${event.uid || startUtc}`,
    event_name: parseEventName(event.summary, series),
    session_type: inferSessionType(event.summary),
    start_time_utc: startUtc,
    end_time_utc: endUtc,
    circuit: event.location || null,
    country: null,
    pole: null,
    winner: null,
    is_major_event: /le mans/i.test(event.summary || ""),
    source: "ical",
  };
}

async function fetchIcalEvents() {
  if (!ICAL_ENABLED) return [];

  const feeds = mergedFeeds();
  if (feeds.length === 0) return [];

  const events = [];
  await Promise.all(
    feeds.map(async (feed) => {
      try {
        const parsed = await ical.async.fromURL(feed.url);
        Object.values(parsed).forEach((entry) => {
          if (entry.type !== "VEVENT" || !entry.start) return;
          if (feed.keyword && !String(entry.summary || "").toLowerCase().includes(feed.keyword)) {
            return;
          }
          events.push(mapIcalEvent(feed.series, entry));
        });
      } catch (_) {
        // Feed failure is non-fatal; other providers still work.
      }
    })
  );

  return events;
}

module.exports = {
  fetchIcalEvents,
};
