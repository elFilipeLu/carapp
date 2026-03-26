const fs = require("node:fs/promises");
const path = require("node:path");
const { PREFERENCES_FILE } = require("../config");
const { getString, setString } = require("./stateStore");

const resolvedFile = path.resolve(PREFERENCES_FILE);

async function ensureStore() {
  await fs.mkdir(path.dirname(resolvedFile), { recursive: true });
  try {
    await fs.access(resolvedFile);
  } catch (_) {
    await fs.writeFile(resolvedFile, JSON.stringify({ profiles: {} }, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(resolvedFile, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.profiles || typeof parsed.profiles !== "object") {
    return { profiles: {} };
  }
  return parsed;
}

async function writeStore(payload) {
  await ensureStore();
  await fs.writeFile(resolvedFile, JSON.stringify(payload, null, 2), "utf8");
}

function cleanProfile(input) {
  const mode = typeof input.displayMode === "string" ? input.displayMode.toLowerCase() : "balanced";
  const safeMode = ["auto", "ultra", "balanced", "detailed"].includes(mode)
    ? mode
    : "balanced";

  return {
    series: Array.isArray(input.series) ? input.series : [],
    sessions: Array.isArray(input.sessions) ? input.sessions : [],
    favorites: Array.isArray(input.favorites) ? input.favorites : [],
    tz: typeof input.tz === "string" && input.tz ? input.tz : "UTC",
    nextOnly: Boolean(input.nextOnly),
    multipleUpcoming: Boolean(input.multipleUpcoming),
    liveAlerts: Boolean(input.liveAlerts),
    results: Boolean(input.results),
    displayMode: safeMode,
    showSeriesLogo:
      input.showSeriesLogo === undefined ? true : Boolean(input.showSeriesLogo),
    showSessionIcon: Boolean(input.showSessionIcon),
    liveBlink: input.liveBlink === undefined ? true : Boolean(input.liveBlink),
    rotateSeries: input.rotateSeries === undefined ? true : Boolean(input.rotateSeries),
  };
}

async function getProfile(profileId) {
  const redisKey = `prefs:${profileId}`;
  const cached = await getString(redisKey);
  if (cached) {
    try {
      return cleanProfile(JSON.parse(cached));
    } catch (_) {
      // Fallback to file store.
    }
  }

  const db = await readStore();
  const record = db.profiles[profileId];
  if (!record) return null;
  const cleaned = cleanProfile(record);
  await setString(redisKey, JSON.stringify(cleaned), 7 * 24 * 60 * 60);
  return cleaned;
}

async function upsertProfile(profileId, profile) {
  const cleaned = cleanProfile(profile);
  const redisKey = `prefs:${profileId}`;
  await setString(redisKey, JSON.stringify(cleaned), 30 * 24 * 60 * 60);

  const db = await readStore();
  db.profiles[profileId] = cleaned;
  await writeStore(db);
  return cleaned;
}

module.exports = {
  getProfile,
  upsertProfile,
};
