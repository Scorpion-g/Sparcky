const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeText, containsBadWord } = require("../../src/utils/badWordUtils");

test("normalizeText removes accents, punctuation and leetspeak", () => {
  const normalized = normalizeText("C0nnârd!!!");
  assert.equal(normalized, "connard");
});

test("containsBadWord detects normalized full words only", () => {
  assert.equal(containsBadWord("Tu es un c0nnard.", ["connard"]), true);
  assert.equal(containsBadWord("connection", ["con"]), false);
});

test("containsBadWord handles empty or whitespace messages", () => {
  assert.equal(containsBadWord("   ", ["connard"]), false);
  assert.equal(containsBadWord("", ["connard"]), false);
});
