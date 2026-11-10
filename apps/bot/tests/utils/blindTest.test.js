const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanString, checkGuess } = require("../../src/utils/blindTestManager");

test("cleanString removes accents, parentheticals, and punctuation", () => {
  assert.equal(cleanString("Démons de Minuit (Remastered 2006)"), "demons de minuit");
  assert.equal(cleanString("Céline Dion [Live in Paris]"), "celine dion");
  assert.equal(cleanString("L'Aventurier - Indochine"), "l aventurier indochine");
});

test("checkGuess correctly matches title and artist", () => {
  const track = {
    title: "Zoo (De \"Zootopie 2\")",
    title_short: "Zoo",
    artist: { name: "Shakira" }
  };

  assert.deepEqual(checkGuess("zoo", track), { matchTitle: true, matchArtist: false });
  assert.deepEqual(checkGuess("shakira", track), { matchTitle: false, matchArtist: true });
  assert.deepEqual(checkGuess("c'est zoo de shakira", track), { matchTitle: true, matchArtist: true });
  assert.deepEqual(checkGuess("bonjour a tous", track), { matchTitle: false, matchArtist: false });
});

test("checkGuess ignores leading articles", () => {
  const track = {
    title: "Les Démons de Minuit",
    title_short: "Les Démons de Minuit",
    artist: { name: "Images" }
  };

  assert.deepEqual(checkGuess("demons de minuit", track), { matchTitle: true, matchArtist: false });
  assert.deepEqual(checkGuess("les demons de minuit", track), { matchTitle: true, matchArtist: false });
});
