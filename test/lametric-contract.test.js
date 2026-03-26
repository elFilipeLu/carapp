const test = require("node:test");
const assert = require("node:assert/strict");
const { makePollPayload } = require("../src/services/lametricContract");

test("makePollPayload enforces 1-3 normalized frames", () => {
  const payload = makePollPayload([
    { text: "Frame one", icon: "i1" },
    { text: "Frame two", icon: "broken" },
    { text: "Frame three", icon: "i3" },
    { text: "Frame four", icon: "i4" },
  ]);

  assert.equal(Array.isArray(payload.frames), true);
  assert.equal(payload.frames.length, 3);
  assert.equal(payload.frames[0].icon, "i1");
  assert.equal(payload.frames[1].icon, "i43558");
});

test("makePollPayload returns fallback when empty", () => {
  const payload = makePollPayload([]);
  assert.equal(payload.frames.length >= 1, true);
  assert.equal(payload.frames[0].text.length > 0, true);
});
