const test = require("node:test");
const assert = require("node:assert/strict");

const calculateLevelXp = require("../../src/utils/calculateLevelXp");

test("returns 1 when level is 0", () => {
  assert.equal(calculateLevelXp(0), 1);
});

test("returns scaled xp requirement for positive levels", () => {
  assert.equal(calculateLevelXp(1), 100);
  assert.equal(calculateLevelXp(5), 500);
});

test("returns negative scaled value for negative levels", () => {
  assert.equal(calculateLevelXp(-2), -200);
});
