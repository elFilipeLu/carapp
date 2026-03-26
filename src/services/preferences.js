function splitCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function unique(items) {
  return Array.from(new Set(items));
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function normalizeSeries(list) {
  return unique(list.map((x) => {
    const normalized = String(x).toUpperCase().replace(/\s+/g, "");
    if (normalized === "LEMANS" || normalized === "LE_MANS") return "LEMANS";
    return normalized;
  }));
}

function normalizeSessions(list) {
  return unique(list.map((x) => String(x).toLowerCase()));
}

function normalizeFavorites(list) {
  return unique(list.map((x) => String(x).toUpperCase()));
}

function normalizeDisplayMode(value, fallback = "balanced") {
  const allowed = new Set(["auto", "ultra", "balanced", "detailed"]);
  const candidate = String(value || fallback).toLowerCase();
  return allowed.has(candidate) ? candidate : "balanced";
}

function parsePreferences(query, base = null) {
  const basePrefs = base || {};
  const series = query.series
    ? normalizeSeries(splitCsv(query.series))
    : normalizeSeries(basePrefs.series || []);
  const sessions = query.sessions
    ? normalizeSessions(splitCsv(query.sessions))
    : normalizeSessions(basePrefs.sessions || []);
  const favorites = query.favorites
    ? normalizeFavorites(splitCsv(query.favorites))
    : normalizeFavorites(basePrefs.favorites || []);

  return {
    series,
    sessions,
    favorites,
    tz: query.tz || basePrefs.tz || "UTC",
    nextOnly: parseBoolean(query.nextOnly, basePrefs.nextOnly ?? true),
    multipleUpcoming: parseBoolean(
      query.multipleUpcoming,
      basePrefs.multipleUpcoming ?? false
    ),
    liveAlerts: parseBoolean(query.liveAlerts, basePrefs.liveAlerts ?? true),
    results: parseBoolean(query.results, basePrefs.results ?? true),
    displayMode: normalizeDisplayMode(query.displayMode, basePrefs.displayMode || "balanced"),
    showSeriesLogo: parseBoolean(query.showSeriesLogo, basePrefs.showSeriesLogo ?? true),
    showSessionIcon: parseBoolean(query.showSessionIcon, basePrefs.showSessionIcon ?? false),
    liveBlink: parseBoolean(query.liveBlink, basePrefs.liveBlink ?? true),
    rotateSeries: parseBoolean(query.rotateSeries, basePrefs.rotateSeries ?? true),
  };
}

function applyFilters(events, prefs) {
  return events.filter((event) => {
    const seriesOk = prefs.series.length === 0 || prefs.series.includes(event.series);
    const sessionOk =
      prefs.sessions.length === 0 || prefs.sessions.includes(event.session_type);
    return seriesOk && sessionOk;
  });
}

module.exports = {
  parsePreferences,
  applyFilters,
  normalizeSeries,
  normalizeSessions,
  normalizeFavorites,
  normalizeDisplayMode,
};
