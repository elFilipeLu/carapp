function splitCsv(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;|]/)
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

const PRESETS = {
  fan1: {
    series: ["F1", "WEC"],
    sessions: ["race", "qualifying"],
    favorites: ["VER"],
    displayMode: "auto",
    rotateSeries: true,
  },
  f1_only: {
    series: ["F1"],
    sessions: ["race", "qualifying"],
    favorites: ["VER", "LEC"],
    displayMode: "ultra",
    rotateSeries: false,
  },
  endurance: {
    series: ["WEC", "IMSA", "GT3", "LEMANS"],
    sessions: ["race", "qualifying"],
    favorites: [],
    displayMode: "balanced",
    rotateSeries: true,
  },
};

function firstDefined(obj, keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== "") {
      return obj[key];
    }
  }
  return undefined;
}

function parsePreferences(query, base = null) {
  const presetKey = String(query.preset || "").toLowerCase();
  const preset = PRESETS[presetKey] || {};
  const basePrefs = { ...preset, ...(base || {}) };

  const seriesInput = firstDefined(query, ["series", "championships", "championship"]);
  const sessionsInput = firstDefined(query, ["sessions", "sessionTypes", "session_types"]);
  const favoritesInput = firstDefined(query, ["favorites", "favorite", "favoriteDriver"]);
  const favoriteTeamInput = firstDefined(query, ["favoriteTeam", "favorite_team"]);

  const series = seriesInput
    ? normalizeSeries(splitCsv(seriesInput))
    : normalizeSeries(basePrefs.series || []);
  const sessions = sessionsInput
    ? normalizeSessions(splitCsv(sessionsInput))
    : normalizeSessions(basePrefs.sessions || []);

  const favorites = normalizeFavorites([
    ...(favoritesInput ? splitCsv(favoritesInput) : basePrefs.favorites || []),
    ...(favoriteTeamInput ? splitCsv(favoriteTeamInput) : []),
  ]);

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
    displayMode: normalizeDisplayMode(
      firstDefined(query, ["displayMode", "mode"]),
      basePrefs.displayMode || "balanced"
    ),
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
