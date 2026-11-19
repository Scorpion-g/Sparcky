const test = require("node:test");
const assert = require("node:assert/strict");
const { isAnswerInSentence, cleanText, stripArticles } = require("../../src/utils/qotdTrivia");

test("cleanText normalizes case, accents, and punctuation", () => {
  assert.equal(cleanText("C'est l'Émeraude !"), "c est l emeraude");
  assert.equal(cleanText("31 lingots."), "31 lingots");
  assert.equal(cleanText("Débris Antiques"), "debris antiques");
});

test("stripArticles removes leading French and English articles", () => {
  assert.equal(stripArticles("l emeraude"), "emeraude");
  assert.equal(stripArticles("le loup"), "loup");
  assert.equal(stripArticles("les baies"), "baies");
  assert.equal(stripArticles("un renard"), "renard");
  assert.equal(stripArticles("une epee"), "epee");
  assert.equal(stripArticles("the dragon"), "dragon");
});

test("isAnswerInSentence detects answers in conversational sentences", () => {
  // Phrases avec chiffres et nombres
  assert.equal(isAnswerInSentence("c'est 31", "31"), true);
  assert.equal(isAnswerInSentence("je dirais 31 lingots", "31"), true);
  assert.equal(isAnswerInSentence("il en faut 31 je crois !", "31"), true);
  assert.equal(isAnswerInSentence("31", "31"), true);
  assert.equal(isAnswerInSentence("c'est 150 cœurs", "150"), true);
  assert.equal(isAnswerInSentence("je pense qu'il en faut 2", "2"), true);

  // Phrases avec mots et articles
  assert.equal(isAnswerInSentence("la reponse c'est l'oeuf de dragon", "oeuf de dragon"), true);
  assert.equal(isAnswerInSentence("je pense que c'est l'émeraude", "émeraude"), true);
  assert.equal(isAnswerInSentence("c'est de la netherite !", "netherite"), true);
  assert.equal(isAnswerInSentence("facile c'est mario", "mario"), true);
  assert.equal(isAnswerInSentence("je crois que c'est le loup", "loup"), true);
  assert.equal(isAnswerInSentence("pour moi c'est mojang studios", "mojang"), true);
  assert.equal(isAnswerInSentence("ce sont des baies sucrées", "baies sucrées"), true);
  assert.equal(isAnswerInSentence("en 2009 évidemment", "2009"), true);
});

test("isAnswerInSentence tolerates minor typos on words with length >= 5", () => {
  assert.equal(isAnswerInSentence("c'est de la netherit", "netherite"), true);
  assert.equal(isAnswerInSentence("c'est l'emeraud", "emeraude"), true);
  assert.equal(isAnswerInSentence("je dirais fortnit", "fortnite"), true);
});

test("isAnswerInSentence rejects false positives and incorrect answers", () => {
  assert.equal(isAnswerInSentence("c'est 131", "31"), false);
  assert.equal(isAnswerInSentence("il y en a 310", "31"), false);
  assert.equal(isAnswerInSentence("12 bambous", "2"), false);
  assert.equal(isAnswerInSentence("bonjour tout le monde", "mario"), false);
  assert.equal(isAnswerInSentence("la réponse est fausse", "netherite"), false);
});
