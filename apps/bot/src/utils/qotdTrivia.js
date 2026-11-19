const { EmbedBuilder } = require("discord.js");
const GuildConfiguration = require("../models/GuildConfiguration");
const User = require("../models/User");

// Pool de questions de trivia variées (Minecraft, Gaming, Pop-culture)
const TRIVIA_QUESTIONS = [
  {
    question: "Quel minerai se génère uniquement dans le Nether et permet d'améliorer les armures en diamant ?",
    answers: ["netherite", "débris antique", "debris antique", "lingot de netherite", "débris antiques", "debris antiques"],
    hint: "Commence par N..."
  },
  {
    question: "Combien de lingots de fer faut-il au total pour fabriquer une enclume complète dans Minecraft ?",
    answers: ["31", "31 lingots", "31 fers"],
    hint: "3 blocs de fer (9x3) + 4 lingots..."
  },
  {
    question: "Quelle est la nourriture préférée des renards dans Minecraft ?",
    answers: ["baies sucrées", "baies sucrees", "baie sucrée", "baie sucree", "baies", "baie"],
    hint: "Un petit fruit rouge qui pique..."
  },
  {
    question: "Quel objet unique obtient-on en tuant l'Ender Dragon dans l'End ?",
    answers: ["oeuf de dragon", "œuf de dragon", "oeuf d'ender dragon", "l'oeuf de dragon", "oeuf dragon"],
    hint: "Il se téléporte quand on clique dessus..."
  },
  {
    question: "Comment s'appelle le mob hostile tourbillonnant apparu dans les Chambres des épreuves (Minecraft 1.21) ?",
    answers: ["breeze", "le breeze"],
    hint: "Le cousin venteux du Blaze..."
  },
  {
    question: "Combien de cœurs possède un Wither dans Minecraft en difficulté normale ?",
    answers: ["150", "300 pv", "150 cœurs", "150 coeurs"],
    hint: "Le double de l'Ender Dragon..."
  },
  {
    question: "Quel est le nom du minerai vert servant de monnaie d'échange avec les villageois ?",
    answers: ["émeraude", "emeraude", "emerald", "les émeraudes", "les emeraudes"],
    hint: "💎 Vert..."
  },
  {
    question: "Comment s'appelle le personnage principal vêtu de vert dans la saga The Legend of Zelda ?",
    answers: ["link", "le héros du temps"],
    hint: "Ce n'est pas Zelda !"
  },
  {
    question: "Dans quel jeu vidéo démarre-t-on la partie en sautant du Battle Bus ?",
    answers: ["fortnite", "fortnite battle royale"],
    hint: "Top 1..."
  },
  {
    question: "En quelle année est sortie la toute première version publique Alpha de Minecraft ?",
    answers: ["2009"],
    hint: "Créé par Notch en mai..."
  },
  {
    question: "Quel est le nom du studio créateur originel de Minecraft ?",
    answers: ["mojang", "mojang studios", "mojang ab"],
    hint: "Un studio suédois..."
  },
  {
    question: "Quel animal sert de fidèle monture à Mario dans les jeux de plateforme Nintendo ?",
    answers: ["yoshi"],
    hint: "Un petit dinosaure vert à langue gluante..."
  },
  {
    question: "Combien de morceaux de bambou faut-il pour confectionner 2 bâtons dans Minecraft ?",
    answers: ["2", "2 bambous"],
    hint: "Un simple alignement vertical..."
  },
  {
    question: "Quel animal peut-on apprivoiser avec un os dans Minecraft ?",
    answers: ["loup", "chien", "le loup", "le chien"],
    hint: "Il aboie et attaque les squelettes..."
  },
  {
    question: "Quel est le nom du célèbre plombier vêtu de rouge de Nintendo ?",
    answers: ["mario", "super mario"],
    hint: "Mamma mia !"
  }
];

// État mémoire des questions actives par serveur
// Map<guildId, { question, answers, reward, channelId, startedAt, hint }>
const activeTriviaMap = new Map();

/**
 * Nettoie et normalise une chaîne (minuscules, sans accents, sans ponctuation, espaces uniques)
 */
function cleanText(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const normalizeString = cleanText;

/**
 * Supprime les articles courants en français et en anglais
 */
function stripArticles(str) {
  if (!str) return "";
  return str.replace(/^(le|la|les|l|un|une|des|du|de|d|the|a|an)\s+/i, "").trim();
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Vérifie si une réponse attendue est repérée dans la phrase ou le message du joueur
 * (gère les phrases conversationnelles "c'est 31", "je dirais l'émeraude", les articles et petites coquilles)
 */
function isAnswerInSentence(userMessage, targetAnswer) {
  const normMsg = cleanText(userMessage);
  const normAns = cleanText(targetAnswer);
  if (!normMsg || !normAns) return false;

  // 1. Égalité directe (avec ou sans articles)
  if (normMsg === normAns) return true;

  const ansNoArticle = stripArticles(normAns);
  const msgNoArticle = stripArticles(normMsg);
  if (normMsg === ansNoArticle || msgNoArticle === normAns || msgNoArticle === ansNoArticle) {
    return true;
  }

  // 2. Recherche en tant que mot ou expression avec frontières de mots
  const escapedAns = normAns.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexAns = new RegExp("(?:^|\\s)" + escapedAns + "(?:\\s|$)", "i");
  if (regexAns.test(normMsg)) return true;

  if (ansNoArticle && ansNoArticle !== normAns) {
    const escapedAnsNoArt = ansNoArticle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexAnsNoArt = new RegExp("(?:^|\\s)" + escapedAnsNoArt + "(?:\\s|$)", "i");
    if (regexAnsNoArt.test(normMsg)) return true;
  }

  // 3. Découpage en mots pour expressions et phrases conversationnelles
  const msgWords = normMsg.split(" ").filter(Boolean);
  const ansWords = normAns.split(" ").filter(Boolean);

  if (ansWords.length > 1) {
    // Si la réponse attendue comporte plusieurs mots (ex: "oeuf de dragon", "31 lingots")
    const n = ansWords.length;
    for (let i = 0; i <= msgWords.length - n; i++) {
      const windowPhrase = msgWords.slice(i, i + n).join(" ");
      if (windowPhrase === normAns || windowPhrase === ansNoArticle) return true;
      if (normAns.length >= 6 && levenshtein(windowPhrase, normAns) <= 1) return true;
    }
  } else {
    // Réponse en un seul mot ou nombre (ex: "31", "netherite", "mario", "link")
    for (const w of msgWords) {
      const wClean = stripArticles(w);
      if (w === normAns || w === ansNoArticle || wClean === normAns || wClean === ansNoArticle) {
        return true;
      }
      // Tolérance faute de frappe d'1 lettre si le mot fait au moins 5 caractères
      if (normAns.length >= 5 && levenshtein(w, normAns) <= 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Publie une nouvelle question du jour sur un serveur
 */
async function postDailyTrivia(client, guildId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return false;

    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    if (guildConfig?.trivia?.enabled === false) return false;

    // Trouver le salon cible : trivia.channelId ou salon général/annonces/événements
    let targetChannel = null;
    if (guildConfig?.trivia?.channelId) {
      targetChannel = guild.channels.cache.get(guildConfig.trivia.channelId);
    }
    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(c => {
        if (c.type !== 0) return false; // GUILD_TEXT
        const n = c.name.toLowerCase();
        return n.includes("trivia") || n.includes("qotd") || n.includes("evenement") || n.includes("évenement") || n.includes("general") || n.includes("discut");
      });
    }

    if (!targetChannel) return false;

    // Déterminer le pool de questions selon la configuration
    let pool = [...TRIVIA_QUESTIONS];
    const customList = Array.isArray(guildConfig?.trivia?.customQuestions) ? guildConfig.trivia.customQuestions : [];

    if (guildConfig?.trivia?.mode === "custom" && customList.length > 0) {
      pool = customList;
    } else if (guildConfig?.trivia?.mode === "both" && customList.length > 0) {
      pool = [...TRIVIA_QUESTIONS, ...customList];
    }

    // Choisir une question aléatoire
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const rewardAmount = guildConfig?.trivia?.rewardAmount || 25;
    const answersList = Array.isArray(picked.answers) ? picked.answers : [picked.answers];

    const embed = new EmbedBuilder()
      .setTitle("🧠 Question du Jour • Trivia Sparcky")
      .setDescription(`**${picked.question}**\n\n💡 **Indice :** *${picked.hint || "Aucun indice"}*\n🎁 **Récompense :** \`+${rewardAmount} 💎\`\n\n*Écrivez directement votre réponse dans ce salon ! Le premier qui trouve remporte le pactole.*`)
      .setColor(0xF59E0B)
      .setFooter({ text: "Sparcky • Question du Jour Automatique", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const msg = await targetChannel.send({ embeds: [embed] });

    const activeData = {
      question: picked.question,
      answers: answersList,
      normalizedAnswers: answersList.map(normalizeString),
      reward: rewardAmount,
      channelId: targetChannel.id,
      messageId: msg.id,
      startedAt: Date.now()
    };

    activeTriviaMap.set(guildId, activeData);

    await GuildConfiguration.updateOne(
      { guildId },
      {
        $set: {
          "trivia.lastQuestionDate": new Date().toISOString().slice(0, 10),
          "trivia.activeQuestion": {
            question: picked.question,
            answers: answersList,
            reward: rewardAmount,
            channelId: targetChannel.id,
            messageId: msg.id,
            startedAt: Date.now()
          }
        }
      },
      { upsert: true }
    );

    return true;
  } catch (err) {
    console.error(`Erreur postDailyTrivia pour guild ${guildId}:`, err);
    return false;
  }
}

/**
 * Vérifie si un message est la réponse à la trivia active
 */
async function checkTriviaAnswer(message) {
  if (!message.guild || message.author.bot) return false;

  let trivia = activeTriviaMap.get(message.guild.id);

  // Fallback si la question a été déclenchée via l'API ou après un redémarrage du bot
  if (!trivia) {
    try {
      const cfg = await GuildConfiguration.findOne({ guildId: message.guild.id }).lean();
      if (cfg?.trivia?.activeQuestion?.channelId === message.channel.id) {
        const aq = cfg.trivia.activeQuestion;
        const answersList = Array.isArray(aq.answers) ? aq.answers : [aq.answers];
        trivia = {
          question: aq.question,
          answers: answersList,
          normalizedAnswers: answersList.map(normalizeString),
          reward: aq.reward || 25,
          channelId: aq.channelId,
          messageId: aq.messageId,
          startedAt: aq.startedAt || Date.now()
        };
        activeTriviaMap.set(message.guild.id, trivia);
      }
    } catch (e) {
      // Ignorer
    }
  }

  if (!trivia) return false;
  if (trivia.channelId !== message.channel.id) return false;

  const cleanInput = cleanText(message.content);
  if (!cleanInput || cleanInput.length < 1) return false;

  const targetAnswers = Array.isArray(trivia.answers) ? trivia.answers : (trivia.normalizedAnswers || []);
  const isCorrect = targetAnswers.some(ans => isAnswerInSentence(message.content, ans));

  if (!isCorrect) return false;

  // Bonne réponse trouvée !
  activeTriviaMap.delete(message.guild.id);
  await GuildConfiguration.updateOne(
    { guildId: message.guild.id },
    { $unset: { "trivia.activeQuestion": "" } }
  ).catch(() => {});

  try {
    await message.react("🏆").catch(() => {});
    await message.react("💎").catch(() => {});

    // Créditer les émeraudes / coins à l'utilisateur
    await User.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { balance: trivia.reward } },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setTitle("🎉 Bonne Réponse !")
      .setDescription(
        `Félicitations à **${message.author}** qui a trouvé la bonne réponse !\n\n` +
        `📌 **Question :** ${trivia.question}\n` +
        `✅ **Réponse :** \`${trivia.answers[0]}\`\n` +
        `💰 **Gain :** \`+${trivia.reward} 💎\` ajoutés à ton portefeuille !`
      )
      .setColor(0x10B981)
      .setFooter({ text: "Sparcky Trivia • Rendez-vous demain pour une nouvelle énigme !" })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    return true;
  } catch (err) {
    console.error("Erreur résolution trivia answer:", err);
    return false;
  }
}

module.exports = {
  TRIVIA_QUESTIONS,
  postDailyTrivia,
  checkTriviaAnswer,
  getActiveTrivia: (guildId) => activeTriviaMap.get(guildId),
  cleanText,
  stripArticles,
  isAnswerInSentence,
  normalizeString
};
