const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.OPENF1_ENABLED = "false";
process.env.ICAL_ENABLED = "false";
process.env.MOCK_FALLBACK_ENABLED = "true";
process.env.ENABLE_NOTIFICATIONS = "false";
process.env.RATE_LIMIT_MAX_REQUESTS = "10";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.PREFERENCES_FILE = path.resolve(
  __dirname,
  "../data/preferences.test.json"
);

const { app } = require("../src/app");

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

test("poll endpoint returns strict lametric payload", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(
    `${baseUrl}/lametric/poll?series=F1&sessions=race,qualifying&tz=Europe/Paris`
  );
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(Array.isArray(json.frames), true);
  assert.equal(Object.prototype.hasOwnProperty.call(json, "selected_event"), false);
  assert.equal(json.frames.length >= 1, true);
});

test("saved profile is used by poll endpoint", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const putResp = await fetch(`${baseUrl}/preferences/fan_test`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      series: ["WEC"],
      sessions: ["race"],
      favorites: ["VER"],
      tz: "Europe/Paris",
      nextOnly: true,
      displayMode: "ultra",
    }),
  });
  assert.equal(putResp.status, 200);

  const pollResp = await fetch(`${baseUrl}/lametric/poll?profile=fan_test`);
  assert.equal(pollResp.status, 200);
  const payload = await pollResp.json();
  assert.equal(Array.isArray(payload.frames), true);
  assert.equal(payload.frames.length >= 1, true);
  assert.equal(payload.frames.length <= 2, true);
});

test("auto mode resolves to a concrete display mode", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(
    `${baseUrl}/lametric?series=F1&sessions=race,qualifying&displayMode=auto&tz=Europe/Paris`
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(["ultra", "balanced", "detailed"].includes(payload.debug.display_mode), true);
});

test("analytics summary returns mode and frame stats", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  await fetch(`${baseUrl}/lametric/poll?series=F1&displayMode=ultra&tz=Europe/Paris`);
  const analyticsResp = await fetch(`${baseUrl}/analytics/summary`);
  assert.equal(analyticsResp.status, 200);
  const analytics = await analyticsResp.json();
  assert.equal(typeof analytics.mode_usage, "object");
  assert.equal(Array.isArray(analytics.top_frames), true);
});

test("multi-series rotation returns a 4-frame deck per selected series", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(
    `${baseUrl}/lametric/poll?series=F1,WEC&sessions=race,qualifying&rotateSeries=true&displayMode=ultra&tz=Europe/Paris`
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Array.isArray(payload.frames), true);
  assert.equal(payload.frames.length >= 4, true);
  assert.equal(payload.frames.length <= 24, true);
});

test("preset and alias parameters work for embedded lametric-only config", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(
    `${baseUrl}/lametric/poll?preset=endurance&championships=WEC;IMSA&sessionTypes=race,qualifying&mode=ultra&tz=Europe/Paris`
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Array.isArray(payload.frames), true);
  assert.equal(payload.frames.length >= 1, true);
});

test("selected profile series are strictly enforced", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const putResp = await fetch(`${baseUrl}/preferences/fan_series`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      series: ["F1", "WEC"],
      sessions: ["race", "qualifying"],
      tz: "Europe/Paris",
      nextOnly: true,
    }),
  });
  assert.equal(putResp.status, 200);

  const lametricResp = await fetch(`${baseUrl}/lametric?profile=fan_series`);
  assert.equal(lametricResp.status, 200);
  const payload = await lametricResp.json();
  assert.equal(["F1", "WEC"].includes(payload.selected_event.series), true);
});

test("missing profile does not fall back to all series", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const standardResp = await fetch(`${baseUrl}/lametric?profile=missing_profile`);
  assert.equal(standardResp.status, 404);
  const standardJson = await standardResp.json();
  assert.equal(standardJson.error, "profile_not_found");

  const pollResp = await fetch(`${baseUrl}/lametric/poll?profile=missing_profile`);
  assert.equal(pollResp.status, 404);
  const pollJson = await pollResp.json();
  assert.equal(Array.isArray(pollJson.frames), true);
  assert.equal(pollJson.frames[0].text.includes("NO PROFILE"), true);
});

test("invalid timezone yields safe poll payload", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/lametric/poll?tz=Nope/Invalid`);
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(Array.isArray(json.frames), true);
  assert.equal(json.frames[0].text.includes("BAD TZ"), true);
});

test("rate limiter blocks after threshold on same route", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  // Burn 10 allowed requests.
  for (let i = 0; i < 10; i += 1) {
    const okResp = await fetch(`${baseUrl}/health`);
    assert.equal(okResp.status, 200);
  }

  const blocked = await fetch(`${baseUrl}/health`);
  assert.equal(blocked.status, 429);
});
