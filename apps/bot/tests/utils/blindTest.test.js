const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cleanString,
  checkGuess,
  isSpokenOrPodcast,
  extractMovieOrUniverse
} = require("../../src/utils/blindTestManager");

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

  assert.deepEqual(checkGuess("zoo", track), { matchTitle: true, matchArtist: false, matchedMovie: false });
  assert.deepEqual(checkGuess("shakira", track), { matchTitle: false, matchArtist: true, matchedMovie: false });
  assert.deepEqual(checkGuess("c'est zoo de shakira", track), { matchTitle: true, matchArtist: true, matchedMovie: false });
  assert.deepEqual(checkGuess("bonjour a tous", track), { matchTitle: false, matchArtist: false, matchedMovie: false });
});

test("checkGuess allows guessing movie / film for themed tracks", () => {
  const track = {
    title: "Ce rêve bleu",
    title_short: "Ce rêve bleu",
    artist: { name: "Karine Costa" },
    movie: "Aladdin"
  };

  assert.deepEqual(checkGuess("ce reve bleu", track), { matchTitle: true, matchArtist: false, matchedMovie: false });
  assert.deepEqual(checkGuess("aladdin", track), { matchTitle: false, matchArtist: true, matchedMovie: true });
  assert.deepEqual(checkGuess("c est aladdin", track), { matchTitle: false, matchArtist: true, matchedMovie: true });
});

test("checkGuess ignores leading articles", () => {
  const track = {
    title: "Les Démons de Minuit",
    title_short: "Les Démons de Minuit",
    artist: { name: "Images" }
  };

  assert.deepEqual(checkGuess("demons de minuit", track), { matchTitle: true, matchArtist: false, matchedMovie: false });
  assert.deepEqual(checkGuess("les demons de minuit", track), { matchTitle: true, matchArtist: false, matchedMovie: false });
});

test("isSpokenOrPodcast detects and rejects audiobooks, stories and podcasts", () => {
  assert.equal(
    isSpokenOrPodcast({
      title: "Chapitre 01 : Zootopie",
      album: { title: "Les histoires des films Disney" },
      artist: { name: "Zootopie" }
    }),
    true
  );

  assert.equal(
    isSpokenOrPodcast({
      title: "Chapitre 12 : Coco",
      album: { title: "Coco (L'histoire du film Disney)" },
      artist: { name: "Coco" }
    }),
    true
  );

  assert.equal(
    isSpokenOrPodcast({
      title: "Épisode 3 - L'aventure",
      album: { title: "Podcast jeunesse" }
    }),
    true
  );

  // Vérifie que les vraies chansons ne sont PAS rejetées
  assert.equal(
    isSpokenOrPodcast({
      title: "Histoire éternelle (De \"La Belle et la Bête\")",
      album: { title: "La Belle et la Bête" },
      artist: { name: "Lucie Dolène" }
    }),
    false
  );

  assert.equal(
    isSpokenOrPodcast({
      title: "Libérée, Délivrée",
      album: { title: "La Reine des Neiges" },
      artist: { name: "Anaïs Delva" }
    }),
    false
  );
});

test("extractMovieOrUniverse extracts film title from track", () => {
  assert.equal(
    extractMovieOrUniverse({
      title: "Partir là-bas (De \"La Petite Sirène\"/Bande Originale Française)",
      album: { title: "La Petite Sirène" }
    }),
    "La Petite Sirène"
  );

  assert.equal(
    extractMovieOrUniverse({
      title: "Un Poco Loco",
      album: { title: "Coco (Bande Originale Française du Film)" }
    }),
    "Coco"
  );
});

test("checkGuess supports lenient fuzzy matching, conversational prefixes and typos", () => {
  const track = {
    title: "Ne parlons pas de Bruno",
    title_short: "Ne parlons pas de Bruno",
    artist: { name: "Sharon Laloum" },
    movie: "Encanto"
  };

  // Titres avec préfixes oraux ou fautes légères
  assert.equal(checkGuess("c'est bruno", track).matchTitle, true);
  assert.equal(checkGuess("ne parle pas de bruno", track).matchTitle, true);
  assert.equal(checkGuess("bruno", track).matchTitle, true);
  assert.equal(checkGuess("je crois que c'est bruno", track).matchTitle, true);

  // Film avec faute d'orthographe ou préfixe
  assert.equal(checkGuess("c'est encanto", track).matchArtist, true);
  assert.equal(checkGuess("encanto", track).matchArtist, true);

  // Morceau légendaire avec fautes fréquentes
  const track2 = {
    title: "Billie Jean",
    title_short: "Billie Jean",
    artist: { name: "Michael Jackson" }
  };

  assert.equal(checkGuess("bily jean", track2).matchTitle, true);
  assert.equal(checkGuess("c est billie jean", track2).matchTitle, true);
  assert.equal(checkGuess("mickael jackson", track2).matchArtist, true);
  assert.equal(checkGuess("c'est jackson", track2).matchArtist, true);
  assert.equal(checkGuess("jackson", track2).matchArtist, true);

  // Message sans rapport qui ne doit pas matcher
  assert.equal(checkGuess("bonjour a tous", track2).matchTitle, false);
  assert.equal(checkGuess("bonjour a tous", track2).matchArtist, false);
  assert.equal(checkGuess("c'est nul", track2).matchTitle, false);
});
