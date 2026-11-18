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

function normalizeString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
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

    // Choisir une question aléatoire
    const picked = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
    const rewardAmount = guildConfig?.trivia?.rewardAmount || 25;

    const embed = new EmbedBuilder()
      .setTitle("🧠 Question du Jour • Trivia Sparcky")
      .setDescription(`**${picked.question}**\n\n💡 **Indice :** *${picked.hint}*\n🎁 **Récompense :** \`+${rewardAmount} 💎\`\n\n*Écrivez directement votre réponse dans ce salon ! Le premier qui trouve remporte le pactole.*`)
      .setColor(0xF59E0B)
      .setFooter({ text: "Sparcky • Question du Jour Automatique", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const msg = await targetChannel.send({ embeds: [embed] });

    activeTriviaMap.set(guildId, {
      question: picked.question,
      answers: picked.answers,
      normalizedAnswers: picked.answers.map(normalizeString),
      reward: rewardAmount,
      channelId: targetChannel.id,
      messageId: msg.id,
      startedAt: Date.now()
    });

    await GuildConfiguration.updateOne(
      { guildId },
      { $set: { "trivia.lastQuestionDate": new Date().toISOString().slice(0, 10) } },
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

  const trivia = activeTriviaMap.get(message.guild.id);
  if (!trivia) return false;
  if (trivia.channelId !== message.channel.id) return false;

  const normalizedInput = normalizeString(message.content);
  if (!normalizedInput || normalizedInput.length < 1) return false;

  const isCorrect = trivia.normalizedAnswers.some(ans => {
    return normalizedInput === ans || (ans.length > 3 && normalizedInput.includes(ans));
  });

  if (!isCorrect) return false;

  // Bonne réponse trouvée !
  activeTriviaMap.delete(message.guild.id);

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
  getActiveTrivia: (guildId) => activeTriviaMap.get(guildId)
};
