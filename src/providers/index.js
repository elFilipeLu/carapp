const { fetchOpenF1Events } = require("./openf1Provider");
const { fetchIcalEvents } = require("./icalProvider");
const { fetchRawEvents: fetchMockEvents } = require("./mockProvider");
const { MOCK_FALLBACK_ENABLED } = require("../config");

let lastStatus = {
  checked_at_utc: null,
  providers: {
    openf1: { ok: false, count: 0, error: "not_checked" },
    ical: { ok: false, count: 0, error: "not_checked" },
    mock: { ok: false, count: 0, error: null },
  },
  selected_source: "none",
};

async function fetchRawEvents() {
  const started = Date.now();
  const [openf1Events, icalEvents] = await Promise.allSettled([fetchOpenF1Events(), fetchIcalEvents()]);

  const primaryEvents = [];
  if (openf1Events.status === "fulfilled") primaryEvents.push(...openf1Events.value);
  if (icalEvents.status === "fulfilled") primaryEvents.push(...icalEvents.value);
  const activeSeries = Array.from(new Set(primaryEvents.map((event) => event.series))).sort();
  const icalSeriesCounts = {};
  if (icalEvents.status === "fulfilled") {
    for (const event of icalEvents.value) {
      icalSeriesCounts[event.series] = (icalSeriesCounts[event.series] || 0) + 1;
    }
  }

  lastStatus = {
    checked_at_utc: new Date().toISOString(),
    latency_ms: Date.now() - started,
    providers: {
      openf1:
        openf1Events.status === "fulfilled"
          ? { ok: true, count: openf1Events.value.length, error: null }
          : { ok: false, count: 0, error: openf1Events.reason?.message || "openf1_failed" },
      ical:
        icalEvents.status === "fulfilled"
          ? {
              ok: true,
              count: icalEvents.value.length,
              error: null,
              series_counts: icalSeriesCounts,
            }
          : { ok: false, count: 0, error: icalEvents.reason?.message || "ical_failed" },
      mock: { ok: false, count: 0, error: null },
    },
    selected_source: "primary",
    active_series: activeSeries,
  };

  if (primaryEvents.length > 0) return primaryEvents;
  if (!MOCK_FALLBACK_ENABLED) return [];

  const mockEvents = await fetchMockEvents();
  lastStatus.providers.mock = { ok: true, count: mockEvents.length, error: null };
  lastStatus.selected_source = "mock_fallback";
  return mockEvents;
}

function getProviderStatus() {
  return lastStatus;
}

module.exports = {
  fetchRawEvents,
  getProviderStatus,
};
