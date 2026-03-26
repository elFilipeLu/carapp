const express = require("express");
const { DateTime } = require("luxon");
const { CACHE_TTL_MS, DEFAULT_TZ } = require("./config");
const {
  ENABLE_NOTIFICATIONS,
  NOTIFICATION_POLL_INTERVAL_MS,
} = require("./config");
const { fetchRawEvents, getProviderStatus } = require("./providers");
const { aggregateEvents } = require("./services/aggregation");
const { prioritize } = require("./services/prioritization");
const { formatFrames, formatProfileSeriesDeck } = require("./services/lametricFormatter");
const {
  parsePreferences,
  applyFilters,
  normalizeSeries,
  normalizeSessions,
  normalizeFavorites,
  normalizeDisplayMode,
} = require("./services/preferences");
const { createCache } = require("./services/cache");
const { authMiddleware } = require("./middleware/auth");
const { rateLimitMiddleware } = require("./middleware/rateLimit");
const { getProfile, upsertProfile } = require("./services/preferencesStore");
const { checkEvents, getRecent } = require("./services/notifications");
const { log } = require("./services/logger");
const { makePollPayload } = require("./services/lametricContract");
const { backendType } = require("./services/stateStore");

const app = express();
const cache = createCache(CACHE_TTL_MS);
const metrics = {
  requests_total: 0,
  requests_by_path: {},
  frame_impressions: {},
  mode_usage: {},
  series_usage: {},
  stale_count: 0,
  poll_responses: 0,
};

app.use(express.json());
app.use(rateLimitMiddleware);
app.use(authMiddleware);
app.use((req, res, next) => {
  const start = Date.now();
  metrics.requests_total += 1;
  metrics.requests_by_path[req.path] = (metrics.requests_by_path[req.path] || 0) + 1;

  res.on("finish", () => {
    log("info", "request", {
      path: req.path,
      method: req.method,
      status: res.statusCode,
      latency_ms: Date.now() - start,
    });
  });
  next();
});

app.get("/", (_, res) => {
  res.json({
    ok: true,
    service: "lametric-motorsport-api",
    endpoints: ["/health", "/lametric", "/lametric/poll"],
  });
});

app.get("/privacy", (_, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Motorsport Companion Privacy Policy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; line-height: 1.5; }
    h1, h2 { margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Motorsport Companion Privacy Policy</h1>
  <p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>

  <h2>What this app does</h2>
  <p>Motorsport Companion provides motorsport schedule and status frames for LaMetric devices.</p>

  <h2>Data collected</h2>
  <p>This service stores only configuration data needed to run the app (for example: selected series, session preferences, timezone, and display options).</p>

  <h2>Personal data</h2>
  <p>This service does not intentionally collect sensitive personal data. No payment information is processed.</p>

  <h2>Third-party sources</h2>
  <p>This app consumes motorsport data from external providers (for example OpenF1 and public calendar feeds).</p>

  <h2>Data sharing</h2>
  <p>We do not sell personal data. Data may be processed by infrastructure providers required to host this service.</p>

  <h2>Contact</h2>
  <p>For privacy questions, contact the app publisher via LaMetric Store support/contact channels.</p>
</body>
</html>`);
});

function validateTz(tz) {
  return DateTime.now().setZone(tz).isValid;
}

async function loadAggregatedEvents() {
  return cache.getOrSet(async () => {
    const raw = await fetchRawEvents();
    return aggregateEvents(raw);
  });
}

async function buildLametricState(query) {
  const profileId = query.profile ? String(query.profile) : null;
  const stored = profileId ? await getProfile(profileId) : null;
  if (profileId && !stored) {
    const error = new Error("profile_not_found");
    error.statusCode = 404;
    throw error;
  }
  const prefs = parsePreferences(query, stored);
  if (!prefs.tz) prefs.tz = DEFAULT_TZ;
  if (!validateTz(prefs.tz)) {
    const error = new Error("invalid_timezone");
    error.statusCode = 400;
    throw error;
  }

  const events = await loadAggregatedEvents();
  const filtered = applyFilters(events, prefs);
  const prioritized = prioritize(filtered);
  const providerStatus = getProviderStatus();
  const checkedAt = providerStatus?.checked_at_utc
    ? DateTime.fromISO(providerStatus.checked_at_utc, { zone: "utc" })
    : null;
  const dataAgeSec =
    checkedAt && checkedAt.isValid
      ? Math.max(0, Math.floor(DateTime.utc().diff(checkedAt, "seconds").seconds))
      : null;
  const isStale = Number.isFinite(dataAgeSec) ? dataAgeSec > 180 : false;

  const selectedEvents = prefs.nextOnly
    ? prioritized.slice(0, 1)
    : prefs.multipleUpcoming
    ? prioritized.slice(0, 3)
    : prioritized.slice(0, 2);

  const primary = selectedEvents[0];
  const effectiveDisplayMode =
    prefs.displayMode === "auto"
      ? isStale
        ? "detailed"
        : primary?.status === "live"
        ? "ultra"
        : "balanced"
      : prefs.displayMode;
  const prefsEffective = { ...prefs, displayMode: effectiveDisplayMode };
  const payload = formatFrames(primary, prefsEffective, { dataAgeSec, isStale });
  let resolvedFrames = payload.frames;

  const multiSeriesSelected = prefs.series.length > 1;
  if (prefs.rotateSeries && multiSeriesSelected) {
    const nextPerSeries = prefs.series
      .map((series) => {
        const scoped = filtered.filter((event) => event.series === series);
        if (scoped.length === 0) return null;
        const scopedPrioritized = prioritize(scoped);
        return scopedPrioritized[0] || null;
      })
      .filter(Boolean);

    if (nextPerSeries.length > 0) {
      resolvedFrames = formatProfileSeriesDeck(nextPerSeries, prefsEffective).frames;
    }
  }

  return {
    profileId,
    prefs,
    events,
    filtered,
    prioritized,
    selectedEvents,
    primary,
    frames: resolvedFrames,
    freshness: { data_age_sec: dataAgeSec, is_stale: isStale },
    providerStatus,
    effectiveDisplayMode,
  };
}

function recordFrameMetrics(state, frames) {
  metrics.poll_responses += 1;
  metrics.mode_usage[state.effectiveDisplayMode] =
    (metrics.mode_usage[state.effectiveDisplayMode] || 0) + 1;
  if (state.primary?.series) {
    metrics.series_usage[state.primary.series] =
      (metrics.series_usage[state.primary.series] || 0) + 1;
  }
  if (state.freshness.is_stale) metrics.stale_count += 1;

  for (const frame of frames) {
    const key = `${frame.icon}|${frame.text}`;
    metrics.frame_impressions[key] = (metrics.frame_impressions[key] || 0) + 1;
  }
}

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "lametric-motorsport-api" });
});

app.get("/providers/status", (_, res) => {
  return res.json({
    ok: true,
    provider_status: getProviderStatus(),
  });
});

app.get("/metrics", (_, res) => {
  return res.json({
    ok: true,
    state_backend: backendType(),
    ...metrics,
  });
});

app.get("/analytics/summary", (_, res) => {
  const topFrames = Object.entries(metrics.frame_impressions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ frame: key, count }));

  return res.json({
    ok: true,
    mode_usage: metrics.mode_usage,
    series_usage: metrics.series_usage,
    stale_ratio:
      metrics.poll_responses > 0 ? metrics.stale_count / metrics.poll_responses : 0,
    top_frames: topFrames,
  });
});

app.get("/preferences/:profileId", async (req, res) => {
  const profile = await getProfile(req.params.profileId);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });
  return res.json({ profile_id: req.params.profileId, preferences: profile });
});

app.put("/preferences/:profileId", async (req, res) => {
  const body = req.body || {};
  const profile = {
    series: normalizeSeries(body.series || []),
    sessions: normalizeSessions(body.sessions || []),
    favorites: normalizeFavorites(body.favorites || []),
    tz: body.tz || DEFAULT_TZ,
    nextOnly: body.nextOnly ?? true,
    multipleUpcoming: body.multipleUpcoming ?? false,
    liveAlerts: body.liveAlerts ?? true,
    results: body.results ?? true,
    displayMode: normalizeDisplayMode(body.displayMode || "balanced"),
    showSeriesLogo: body.showSeriesLogo ?? true,
    showSessionIcon: body.showSessionIcon ?? false,
    liveBlink: body.liveBlink ?? true,
    rotateSeries: body.rotateSeries ?? true,
  };
  if (!validateTz(profile.tz)) {
    return res.status(400).json({ error: "invalid_timezone" });
  }

  const saved = await upsertProfile(req.params.profileId, profile);
  return res.json({ profile_id: req.params.profileId, preferences: saved });
});

app.get("/lametric", async (req, res) => {
  try {
    const state = await buildLametricState(req.query);

    return res.json({
      generated_at_utc: new Date().toISOString(),
      selected_event: state.primary || null,
      frames: state.frames,
      debug: {
        total_events: state.events.length,
        filtered_events: state.filtered.length,
        profile_id: state.profileId || null,
        display_mode: state.effectiveDisplayMode,
        freshness: state.freshness,
      },
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(503).json({
      frames: [
        { text: "NO DATA", icon: "i43558" },
        { text: "CHECK API", icon: "i43558" },
      ],
      error: "upstream_failure",
      detail: error.message,
    });
  }
});

app.get("/lametric/poll", async (req, res) => {
  try {
    const state = await buildLametricState(req.query);
    const payload = makePollPayload(state.frames);
    recordFrameMetrics(state, payload.frames);
    res.setHeader("cache-control", "public, max-age=25");
    return res.json(payload);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json(makePollPayload([{ text: "BAD TZ", icon: "i43558" }]));
    }
    if (error.statusCode === 404) {
      return res.status(404).json(makePollPayload([{ text: "NO PROFILE", icon: "i43558" }]));
    }
    return res.status(503).json(makePollPayload());
  }
});

app.post("/notifications/run", async (_, res) => {
  const events = await loadAggregatedEvents();
  const notifications = await checkEvents(events);
  return res.json({ produced: notifications.length, notifications });
});

app.get("/notifications/recent", async (req, res) => {
  const limit = Number(req.query.limit || 20);
  const notifications = await getRecent(Math.max(1, Math.min(100, limit)));
  return res.json({ notifications });
});

if (ENABLE_NOTIFICATIONS) {
  setInterval(async () => {
    try {
      const events = await loadAggregatedEvents();
      const created = await checkEvents(events);
      if (created.length > 0) {
        log("info", "notifications_produced", { count: created.length });
      }
    } catch (error) {
      log("error", "notifications_failed", { error: error.message });
    }
  }, NOTIFICATION_POLL_INTERVAL_MS).unref();
}

module.exports = {
  app,
};
