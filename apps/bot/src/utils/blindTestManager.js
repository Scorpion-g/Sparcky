const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior
} = require("@discordjs/voice");
const { Readable } = require("stream");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("./logger");
const User = require("../models/User");
const GuildConfiguration = require("../models/GuildConfiguration");

// Thèmes musicaux disponibles avec requêtes Deezer (playlists officielles et vérifiées)
const THEMES = {
  hits: {
    name: "Top Hits Français & Internationaux",
    emoji: "🔥",
    urls: [
      "https://api.deezer.com/chart/0/tracks?limit=100",
      "https://api.deezer.com/playlist/1109890291/tracks?limit=100" // Titres du moment
    ]
  },
  "80s_90s": {
    name: "Années 80 & 90 Nostalgie",
    emoji: "🕺",
    urls: [
      "https://api.deezer.com/playlist/1163842311/tracks?limit=100", // En mode 80
      "https://api.deezer.com/playlist/1251125011/tracks?limit=100", // En mode 90
      "https://api.deezer.com/playlist/1268089951/tracks?limit=100"  // Stars 80
    ]
  },
  rap: {
    name: "Rap Français & US",
    emoji: "🎤",
    urls: [
      "https://api.deezer.com/playlist/1629661895/tracks?limit=100", // Rap Soirée
      "https://api.deezer.com/playlist/1071669561/tracks?limit=100", // Actu Rap
      "https://api.deezer.com/playlist/9563400362/tracks?limit=100"  // Rapstars
    ]
  },
  disney: {
    name: "Disney & Dessins Animés",
    emoji: "🏰",
    urls: [
      "https://api.deezer.com/playlist/7548451242/tracks?limit=100", // Disney Hits France (chansons cultes & récentes)
      "https://api.deezer.com/playlist/6153956244/tracks?limit=100"  // Disney : Les 100 plus belles chansons
    ]
  },
  cinema: {
    name: "Films & Séries Culte",
    emoji: "🍿",
    urls: [
      "https://api.deezer.com/playlist/754776991/tracks?limit=100",  // Film Classics
      "https://api.deezer.com/playlist/3415555122/tracks?limit=100", // Greatest Movies Epic Soundtracks
      "https://api.deezer.com/playlist/10485891442/tracks?limit=100" // 100 musiques de films culte
    ]
  },
  anime_gaming: {
    name: "Anime, Manga & Gaming",
    emoji: "🎮",
    urls: [
      "https://api.deezer.com/playlist/9016993522/tracks?limit=100", // Anime Essentials 定番アニメ
      "https://api.deezer.com/playlist/7490833544/tracks?limit=100"  // Best Anime Openings
    ]
  }
};

// Traductions des films culte pour autoriser les réponses en français
const MOVIE_TRANSLATIONS = {
  "the lion king": "le roi lion",
  "the little mermaid": "la petite sirene",
  "beauty and the beast": "la belle et la bete",
  "snow white": "blanche neige",
  "sleeping beauty": "la belle au bois dormant",
  "frozen": "la reine des neiges",
  "tangled": "raiponce",
  "moana": "vaiana",
  "the jungle book": "le livre de la jungle",
  "the aristocats": "les aristochats",
  "the nightmare before christmas": "l etrange noel de monsieur jack"
};

// Map des parties actives : guildId -> GameInstance
const activeGames = new Map();

/**
 * Filtre les livres audio, podcasts, chapitres parlés et bruitages
 */
function isSpokenOrPodcast(track) {
  const badPatterns = [
    /^(?:chapitre|chapter|épisode|episode)\s*\d+/i,
    /\b(?:audiobook|livre audio|podcast)\b/i,
    /^(?:les\s+)?histoires?\s+(?:de|du|des|pour)\b/i,
    /\bvol(?:\.|\s)\s*\d+/i,
    /\bpart\s*\d+/i,
    /\bbruitage\b/i,
    /\bsound effect\b/i
  ];
  const badAlbumPatterns = [
    /\b(?:audiobook|livre audio|podcast)\b/i,
    /^(?:les\s+)?histoires?\s+(?:de|du|des|pour)\b/i,
    /les histoires des films/i
  ];
  const title = track.title || "";
  const titleShort = track.title_short || "";
  const album = track.album?.title || "";
  const artist = track.artist?.name || "";

  if (badPatterns.some((re) => re.test(title) || re.test(titleShort))) return true;
  if (badAlbumPatterns.some((re) => re.test(album))) return true;
  if (/\b(?:audiobook|livre audio|podcast)\b/i.test(artist)) return true;
  return false;
}

/**
 * Extrait le nom du film ou univers (Disney, films, etc.) depuis le titre ou l'album
 */
function extractMovieOrUniverse(track) {
  const title = track.title || "";
  const match = title.match(/(?:de|from)\s*["«“]([^"»”]+)["»”]/i);
  if (match) return match[1].trim();

  const album = track.album?.title || "";
  const cleanedAlbum = album
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/(?:original soundtrack|bande originale.*|motion picture soundtrack|soundtrack|b\.?o\.?f?)/gi, "")
    .replace(/[-:]\s*$/g, "")
    .trim();

  if (cleanedAlbum && cleanedAlbum.length >= 3) {
    return cleanedAlbum;
  }
  return null;
}

/**
 * Nettoie une chaîne pour une comparaison tolérante
 */
function cleanString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
    .replace(/\(.*?\)/g, "") // Enlève les parenthèses (feat, version...)
    .replace(/\[.*?\]/g, "") // Enlève les crochets
    .replace(/[^a-z0-9\s]/g, " ") // Ne garde que lettres et chiffres
    .replace(/\s+/g, " ") // Normalise les espaces
    .trim();
}

/**
 * Supprime les articles initiaux (le, la, les, the, a...)
 */
function stripLeadingArticle(str) {
  return str.replace(/^(le|la|les|l|the|a|an|un|une|des)\s+/i, "").trim();
}

/**
 * Vérifie si une tentative correspond au titre, à l'artiste ou au film
 */
function checkGuess(guess, track) {
  const cleanGuess = cleanString(guess);
  if (!cleanGuess || cleanGuess.length < 2) {
    return { matchTitle: false, matchArtist: false, matchedMovie: false };
  }

  const rawTitle = track.title_short || track.title || "";
  const cleanTitle = cleanString(rawTitle);
  const titleNoArticle = stripLeadingArticle(cleanTitle);

  const rawArtist = track.artist?.name || "";
  const cleanArtist = cleanString(rawArtist);
  const artistNoArticle = stripLeadingArticle(cleanArtist);

  const rawMovie = track.movie || "";
  const cleanMovie = cleanString(rawMovie);
  const movieNoArticle = stripLeadingArticle(cleanMovie);
  const translatedMovie = cleanMovie ? MOVIE_TRANSLATIONS[cleanMovie] : null;

  let matchTitle = false;
  if (cleanTitle.length >= 2) {
    if (cleanGuess === cleanTitle || cleanGuess === titleNoArticle) {
      matchTitle = true;
    } else if (cleanGuess.includes(cleanTitle) || (cleanGuess.length >= 3 && cleanTitle.includes(cleanGuess))) {
      matchTitle = true;
    } else if (titleNoArticle.length >= 3 && (cleanGuess.includes(titleNoArticle) || titleNoArticle.includes(cleanGuess))) {
      matchTitle = true;
    }
  }

  let matchArtist = false;
  let matchedMovie = false;
  if (cleanArtist.length >= 2) {
    if (cleanGuess === cleanArtist || cleanGuess === artistNoArticle) {
      matchArtist = true;
    } else if (cleanGuess.includes(cleanArtist) || (cleanGuess.length >= 3 && cleanArtist.includes(cleanGuess))) {
      matchArtist = true;
    } else if (artistNoArticle.length >= 3 && (cleanGuess.includes(artistNoArticle) || artistNoArticle.includes(cleanGuess))) {
      matchArtist = true;
    }
  }

  // Si l'artiste n'est pas trouvé et qu'un film/univers est associé (Disney, Cinéma...)
  if (!matchArtist && cleanMovie && cleanMovie.length >= 3) {
    const candidates = [cleanMovie, movieNoArticle];
    if (translatedMovie) candidates.push(translatedMovie);

    for (const cand of candidates) {
      if (!cand || cand.length < 3) continue;
      if (cleanGuess === cand || cleanGuess.includes(cand) || (cleanGuess.length >= 3 && cand.includes(cleanGuess))) {
        matchArtist = true;
        matchedMovie = true;
        break;
      }
    }
  }

  return { matchTitle, matchArtist, matchedMovie };
}

/**
 * Mélange un tableau aléatoirement (Fisher-Yates)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Récupère des morceaux depuis Deezer pour un thème donné
 */
async function fetchTracksForTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.hits;
  const urls = theme.urls || (theme.url ? [theme.url] : []);
  const allTracks = [];
  const seenIds = new Set();

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = (data.data || []).filter(
        (t) => t.preview && t.title && t.artist?.name && !isSpokenOrPodcast(t) && !seenIds.has(t.id)
      );
      for (const t of list) {
        seenIds.add(t.id);
        t.movie = extractMovieOrUniverse(t);
        allTracks.push(t);
      }
    } catch (err) {
      logger.warn(`[BLINDTEST] Impossible de charger la playlist ${url}: ${err.message}`);
    }
  }

  return shuffle(allTracks);
}

/**
 * Crée une ressource audio en streamant le MP3 avec un User-Agent valide
 */
async function getAudioResource(url) {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8"
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} lors de la récupération de l'audio`);
  }

  const stream = Readable.fromWeb(res.body);
  const resource = createAudioResource(stream, {
    inlineVolume: true
  });
  if (resource.volume) {
    resource.volume.setVolume(1.0);
  }
  return resource;
}

/**
 * Démarre une nouvelle partie de Blind Test
 */
async function startBlindTest(interaction, themeKey = "hits", roundsCount = 10) {
  const member = interaction.member;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({
      content: "❌ Vous devez être connecté dans un salon vocal pour lancer le Blind Test !",
      ephemeral: true
    });
  }

  const permissions = voiceChannel.permissionsFor(interaction.client.user);
  if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
    return interaction.reply({
      content: "❌ Je n'ai pas les permissions suffisantes pour rejoindre et parler dans votre salon vocal.",
      ephemeral: true
    });
  }

  if (activeGames.has(interaction.guild.id)) {
    return interaction.reply({
      content: "⚠️ Une partie de Blind Test est déjà en cours sur ce serveur ! Utilisez `/blindtest stop` pour la stopper.",
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const theme = THEMES[themeKey] || THEMES.hits;
  const tracks = await fetchTracksForTheme(themeKey);

  if (!tracks || tracks.length < 3) {
    return interaction.editReply({
      content: "❌ Impossible de charger les extraits musicaux pour ce thème. Veuillez réessayer."
    });
  }

  const totalRounds = Math.min(roundsCount, tracks.length);
  const selectedTracks = tracks.slice(0, totalRounds);

  // Connexion au salon vocal
  let connection;
  try {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 10000);
  } catch (err) {
    logger.error(`[BLINDTEST] Erreur de connexion vocale: ${err?.message}`);
    return interaction.editReply({
      content: "❌ Impossible de rejoindre le salon vocal. Vérifiez mes permissions."
    });
  }

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
      maxMissedFrames: 250
    }
  });

  player.on(AudioPlayerStatus.Playing, () => {
    logger.info(`[BLINDTEST] Audio en lecture sur ${voiceChannel.name} (manche ${game.currentRound})`);
  });

  player.on(AudioPlayerStatus.Idle, () => {
    logger.info(`[BLINDTEST] Audio player inactif`);
  });

  player.on("error", (err) => {
    logger.error(`[BLINDTEST] Erreur audio player: ${err?.message}`);
  });

  connection.on("stateChange", (oldState, newState) => {
    logger.info(`[BLINDTEST] VoiceConnection: ${oldState.status} -> ${newState.status}`);
  });

  connection.on("error", (err) => {
    logger.error(`[BLINDTEST] Erreur connexion vocale: ${err?.message}`);
  });

  connection.subscribe(player);

  const game = {
    guildId: interaction.guild.id,
    voiceChannel,
    textChannel: interaction.channel,
    connection,
    player,
    theme,
    totalRounds,
    currentRound: 1,
    tracksPool: selectedTracks,
    currentTrack: null,
    titleFoundBy: null,
    artistFoundBy: null,
    scores: new Map(), // userId -> { user, score: 0 }
    roundTimeout: null,
    messageCollector: null,
    isEnded: false
  };

  activeGames.set(interaction.guild.id, game);

  const startEmbed = new EmbedBuilder()
    .setTitle(`🎧 BLIND TEST MUSICAL : ${theme.name}`)
    .setDescription(
      `La partie démarre dans le vocal **${voiceChannel.name}** !\n\n` +
      `🎯 **Thème :** ${theme.emoji} **${theme.name}**\n` +
      `🔢 **Nombre de manches :** \`${totalRounds}\`\n\n` +
      `**📜 Règles du jeu :**\n` +
      `• Écoutez les extraits de 30 secondes diffusés dans le vocal.\n` +
      `• Écrivez vos réponses dans **ce salon textuel** !\n` +
      `• **+1 point** pour le **Titre** trouvé.\n` +
      `• **+1 point** pour l'**Artiste** trouvé.\n\n` +
      `🚀 *Lancement de la première manche...*`
    )
    .setColor(0x6366f1)
    .setFooter({ text: "God_Sparky Blind Test • Préparez vos claviers !" })
    .setTimestamp();

  await interaction.editReply({ embeds: [startEmbed] });

  // Lancer la première manche après 2 secondes
  setTimeout(() => {
    if (!game.isEnded) {
      playNextRound(game);
    }
  }, 2000);
}

/**
 * Lance la manche suivante
 */
async function playNextRound(game) {
  if (game.isEnded) return;

  if (game.currentRound > game.totalRounds) {
    return finishGame(game);
  }

  const track = game.tracksPool[game.currentRound - 1];
  game.currentTrack = track;
  game.titleFoundBy = null;
  game.artistFoundBy = null;

  // Création et lecture de la ressource audio Deezer via stream HTTP sécurisé
  try {
    const resource = await getAudioResource(track.preview);
    game.player.play(resource);
  } catch (err) {
    logger.error(`[BLINDTEST] Erreur lecture preview (${track.title}): ${err.message}`);
  }

  const roundEmbed = new EmbedBuilder()
    .setTitle(`🎵 Manche ${game.currentRound} / ${game.totalRounds}`)
    .setDescription(
      `Écoutez l'extrait musical dans le salon vocal **${game.voiceChannel.name}** !\n\n` +
      `💡 Devinez le **Titre** (+1 pt) et l'**Artiste** (+1 pt).\n` +
      `⏱️ **Temps restant :** \`30 secondes\``
    )
    .setColor(0x38bdf8)
    .setFooter({ text: "Tapez votre réponse directement ici !" })
    .setTimestamp();

  await game.textChannel.send({ embeds: [roundEmbed] }).catch(() => {});

  // Collecteur de messages dans le salon textuel
  const filter = (m) => !m.author.bot;
  const collector = game.textChannel.createMessageCollector({
    filter,
    time: 30000
  });
  game.messageCollector = collector;

  collector.on("collect", async (msg) => {
    if (game.isEnded) return;

    const { matchTitle, matchArtist, matchedMovie } = checkGuess(msg.content, track);

    // Titre trouvé
    if (matchTitle && !game.titleFoundBy) {
      game.titleFoundBy = msg.author.id;
      addScore(game, msg.author, 1);
      await msg.react("🎵").catch(() => {});
      await game.textChannel.send({
        content: `🎉 Bravo <@${msg.author.id}> a trouvé le **titre** ! (+1 pt)`
      }).catch(() => {});
    }

    // Artiste (ou film / univers) trouvé
    if (matchArtist && !game.artistFoundBy) {
      game.artistFoundBy = msg.author.id;
      addScore(game, msg.author, 1);
      await msg.react(matchedMovie ? "🎬" : "🎤").catch(() => {});
      const label = matchedMovie ? "le **film / univers**" : "l'**artiste**";
      await game.textChannel.send({
        content: `🎯 Bien joué <@${msg.author.id}> a trouvé ${label} ! (+1 pt)`
      }).catch(() => {});
    }

    // Si les deux sont trouvés, on arrête la manche sans attendre les 30s
    if (game.titleFoundBy && game.artistFoundBy) {
      collector.stop("FOUND_ALL");
    }
  });

  collector.on("end", async (_collected, reason) => {
    if (game.isEnded) return;
    await endRound(game);
  });
}

/**
 * Termine la manche en cours et affiche la solution
 */
async function endRound(game) {
  game.player.stop();

  const track = game.currentTrack;
  const titleWinner = game.titleFoundBy ? `<@${game.titleFoundBy}>` : "*Non trouvé*";
  const artistWinner = game.artistFoundBy ? `<@${game.artistFoundBy}>` : "*Non trouvé*";

  // Tri des scores actuels
  const sortedScores = Array.from(game.scores.values()).sort((a, b) => b.score - a.score);
  const scoreText = sortedScores.length > 0
    ? sortedScores.slice(0, 5).map((s, idx) => `**#${idx + 1}** ${s.user.username} : \`${s.score} pt(s)\``).join("\n")
    : "*Aucun point marqué sur cette manche*";

  const movieLine = track.movie ? `🎬 **Film / Univers :** **${track.movie}**\n` : "";

  const resultEmbed = new EmbedBuilder()
    .setTitle(`🔔 Fin de la Manche ${game.currentRound} / ${game.totalRounds}`)
    .setDescription(
      `🎶 **Morceau :** **${track.title}**\n` +
      `👤 **Artiste :** **${track.artist.name}**\n` +
      movieLine +
      `\n🏆 **Titre trouvé par :** ${titleWinner}\n` +
      `🎤 **Artiste / Film trouvé par :** ${artistWinner}\n\n` +
      `📊 **Classement actuel :**\n${scoreText}`
    )
    .setColor(0x10b981)
    .setTimestamp();

  if (track.album?.cover_medium) {
    resultEmbed.setThumbnail(track.album.cover_medium);
  }

  await game.textChannel.send({ embeds: [resultEmbed] }).catch(() => {});

  game.currentRound++;

  // Pause de 4 secondes avant la manche suivante
  setTimeout(() => {
    if (!game.isEnded) {
      playNextRound(game);
    }
  }, 4000);
}

/**
 * Termine complètement la partie et affiche le podium
 */
async function finishGame(game) {
  game.isEnded = true;
  game.player.stop();

  if (game.connection) {
    try {
      game.connection.destroy();
    } catch {}
  }

  activeGames.delete(game.guildId);

  const sortedScores = Array.from(game.scores.values()).sort((a, b) => b.score - a.score);

  // Vérifier si l'économie est activée pour attribuer des récompenses
  let economyEnabled = false;
  try {
    const config = await GuildConfiguration.findOne({ guildId: game.guildId });
    economyEnabled = config?.economyEnabled !== false;
  } catch {}

  let podiumText = "";
  if (sortedScores.length === 0) {
    podiumText = "*Aucun point n'a été marqué durant cette partie.*";
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    const rewards = [200, 100, 50]; // Pièces gagnées

    podiumText = sortedScores.map((s, idx) => {
      const medal = medals[idx] || `\`#${idx + 1}\``;
      let extraReward = "";

      if (economyEnabled && idx < 3) {
        const coinAmount = rewards[idx];
        extraReward = ` (+${coinAmount} 🪙)`;
        // Créditer les pièces en BDD
        User.findOneAndUpdate(
          { guildId: game.guildId, userId: s.user.id },
          { $inc: { money: coinAmount } },
          { upsert: true }
        ).catch(() => {});
      }

      return `${medal} **${s.user.username}** — **${s.score} point(s)**${extraReward}`;
    }).join("\n");
  }

  const finalEmbed = new EmbedBuilder()
    .setTitle(`🏆 RÉSULTAT DU BLIND TEST : ${game.theme.name}`)
    .setDescription(
      `Merci d'avoir joué ! Voici le podium final de la partie :\n\n` +
      `${podiumText}\n\n` +
      (economyEnabled ? `🪙 *Des récompenses économiques ont été créditées aux 3 meilleurs joueurs !*` : "")
    )
    .setColor(0xf59e0b)
    .setFooter({ text: "God_Sparky Blind Test • Relancez une partie avec /blindtest start !" })
    .setTimestamp();

  await game.textChannel.send({ embeds: [finalEmbed] }).catch(() => {});
  logger.info(`[BLINDTEST] Partie terminée sur ${game.guildId} (${game.totalRounds} manches)`);
}

/**
 * Arrête une partie en cours
 */
function stopBlindTest(guildId) {
  const game = activeGames.get(guildId);
  if (!game) return false;

  game.isEnded = true;
  if (game.messageCollector) game.messageCollector.stop("FORCED_STOP");
  game.player.stop();

  if (game.connection) {
    try {
      game.connection.destroy();
    } catch {}
  }

  activeGames.delete(guildId);
  return true;
}

/**
 * Ajoute des points à un utilisateur
 */
function addScore(game, user, points = 1) {
  const existing = game.scores.get(user.id) || { user, score: 0 };
  existing.score += points;
  game.scores.set(user.id, existing);
}

/**
 * Retourne la liste des thèmes
 */
function getThemes() {
  return THEMES;
}

/**
 * Vérifie si une partie est active
 */
function isGameActive(guildId) {
  return activeGames.has(guildId);
}

module.exports = {
  startBlindTest,
  stopBlindTest,
  getThemes,
  isGameActive,
  checkGuess,
  cleanString,
  getAudioResource,
  isSpokenOrPodcast,
  extractMovieOrUniverse
};
