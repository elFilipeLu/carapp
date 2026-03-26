const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

function clearRequireCache() {
  const targets = [
    "/src/app.js",
    "/src/config.js",
    "/src/middleware/auth.js",
    "/src/middleware/rateLimit.js",
  ];
  for (const key of Object.keys(require.cache)) {
    if (targets.some((target) => key.endsWith(target))) {
      delete require.cache[key];
    }
  }
}

function withEnv(overrides) {
  const previous = new Map();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }
  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

async function startServer(env = {}) {
  const restoreEnv = withEnv({
    OPENF1_ENABLED: "false",
    ICAL_ENABLED: "false",
    MOCK_FALLBACK_ENABLED: "true",
    ENABLE_NOTIFICATIONS: "false",
    RATE_LIMIT_MAX_REQUESTS: "1000",
    RATE_LIMIT_WINDOW_MS: "60000",
    PREFERENCES_FILE: path.resolve(__dirname, "../data/preferences.auth.test.json"),
    API_TOKEN: "",
    POLL_TOKEN: "",
    ...env,
  });
  clearRequireCache();
  const { app } = require("../src/app");

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: async () => {
      await new Promise((resolve) => server.close(() => resolve()));
      restoreEnv();
      clearRequireCache();
    },
  };
}

test("poll token protects poll and keeps admin routes locked without API token", async (t) => {
  const ctx = await startServer({ POLL_TOKEN: "poll-secret", API_TOKEN: "" });
  t.after(async () => ctx.close());

  const pollNoToken = await fetch(`${ctx.baseUrl}/lametric/poll?series=F1`);
  assert.equal(pollNoToken.status, 401);

  const pollWithToken = await fetch(`${ctx.baseUrl}/lametric/poll?series=F1&token=poll-secret`);
  assert.equal(pollWithToken.status, 200);

  const adminNoApiToken = await fetch(`${ctx.baseUrl}/preferences/fan_secure`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ series: ["F1"], sessions: ["race"], tz: "UTC" }),
  });
  assert.equal(adminNoApiToken.status, 401);
});

test("api token protects poll when poll token is unset", async (t) => {
  const ctx = await startServer({ API_TOKEN: "api-secret", POLL_TOKEN: "" });
  t.after(async () => ctx.close());

  const pollNoToken = await fetch(`${ctx.baseUrl}/lametric/poll?series=F1`);
  assert.equal(pollNoToken.status, 401);

  const pollWithApiToken = await fetch(`${ctx.baseUrl}/lametric/poll?series=F1&token=api-secret`);
  assert.equal(pollWithApiToken.status, 200);
});

test("poll token and api token are isolated", async (t) => {
  const ctx = await startServer({ API_TOKEN: "api-secret", POLL_TOKEN: "poll-secret" });
  t.after(async () => ctx.close());

  const pollWithApiToken = await fetch(`${ctx.baseUrl}/lametric/poll?series=F1&token=api-secret`);
  assert.equal(pollWithApiToken.status, 401);

  const pollWithPollToken = await fetch(`${ctx.baseUrl}/lametric/poll?series=F1&token=poll-secret`);
  assert.equal(pollWithPollToken.status, 200);

  const adminWithPollToken = await fetch(`${ctx.baseUrl}/preferences/fan_secure?token=poll-secret`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ series: ["F1"], sessions: ["race"], tz: "UTC" }),
  });
  assert.equal(adminWithPollToken.status, 401);

  const adminWithApiToken = await fetch(`${ctx.baseUrl}/preferences/fan_secure?token=api-secret`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ series: ["F1"], sessions: ["race"], tz: "UTC" }),
  });
  assert.equal(adminWithApiToken.status, 200);
});
