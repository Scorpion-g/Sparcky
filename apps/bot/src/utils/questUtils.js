const User = require("../models/User");
const Level = require("../models/Level");
const logger = require("./logger");

const QUEST_POOL = [
  {
    id: "messages",
    type: "messages",
    title: "💬 Discuter dans les salons texte",
    description: "Envoyer 25 messages dans les salons textuels",
    target: 25,
    rewardCoins: 150,
    rewardXp: 80,
  },
  {
    id: "coinflip",
    type: "coinflip",
    title: "🪙 Jouer au Pile ou Face",
    description: "Lancer 3 parties de /coinflip",
    target: 3,
    rewardCoins: 120,
    rewardXp: 60,
  },
  {
    id: "daily",
    type: "daily",
    title: "📅 Récupérer son salaire journalier",
    description: "Récupérer votre récompense avec /daily",
    target: 1,
    rewardCoins: 100,
    rewardXp: 50,
  },
  {
    id: "work",
    type: "work",
    title: "💼 Travailler pour le serveur",
    description: "Effectuer 2 sessions de /work",
    target: 2,
    rewardCoins: 130,
    rewardXp: 70,
  },
  {
    id: "duel",
    type: "duel",
    title: "⚔️ Défier un autre joueur",
    description: "Participer à 1 /duel contre un membre",
    target: 1,
    rewardCoins: 150,
    rewardXp: 90,
  },
];

/**
 * Retourne la date du jour au format YYYY-MM-DD
 */
function getTodayString() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/**
 * Génère 3 quêtes aléatoires et uniques pour aujourd'hui
 */
function generateDailyQuests() {
  const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map((q) => ({
    id: q.id,
    type: q.type,
    title: q.title,
    description: q.description,
    target: q.target,
    progress: 0,
    completed: false,
    rewardCoins: q.rewardCoins,
    rewardXp: q.rewardXp,
  }));
}

/**
 * Récupère ou initialise les quêtes du jour d'un utilisateur
 */
async function getUserQuests(userId, guildId) {
  const today = getTodayString();
  let user = await User.findOne({ userId, guildId });

  if (!user) {
    user = new User({ userId, guildId, balance: 0 });
  }

  if (!user.dailyQuests || user.dailyQuests.date !== today || !Array.isArray(user.dailyQuests.quests) || user.dailyQuests.quests.length === 0) {
    user.dailyQuests = {
      date: today,
      quests: generateDailyQuests(),
      claimed: false,
    };
    await user.save();
  }

  return user.dailyQuests;
}

/**
 * Fait progresser une quête du jour pour un type d'action donné
 */
async function incrementQuestProgress(userId, guildId, type, amount = 1) {
  try {
    const today = getTodayString();
    const user = await User.findOne({ userId, guildId });
    if (!user) return;

    if (!user.dailyQuests || user.dailyQuests.date !== today) {
      user.dailyQuests = {
        date: today,
        quests: generateDailyQuests(),
        claimed: false,
      };
    }

    let modified = false;
    for (const q of user.dailyQuests.quests) {
      if (q.type === type && !q.completed) {
        q.progress = Math.min(q.target, (q.progress || 0) + amount);
        if (q.progress >= q.target) {
          q.completed = true;
        }
        modified = true;
      }
    }

    if (modified) {
      user.markModified("dailyQuests");
      await user.save();
    }
  } catch (err) {
    logger.warn(`[QUESTS] Erreur incrémentation quête (${type}): ${err.message}`);
  }
}

/**
 * Réclame les récompenses des quêtes complétées
 */
async function claimQuestRewards(userId, guildId) {
  const today = getTodayString();
  const user = await User.findOne({ userId, guildId });
  if (!user || !user.dailyQuests || user.dailyQuests.date !== today) {
    return { success: false, reason: "NO_QUESTS" };
  }

  if (user.dailyQuests.claimed) {
    return { success: false, reason: "ALREADY_CLAIMED" };
  }

  const completedQuests = user.dailyQuests.quests.filter((q) => q.completed);
  if (completedQuests.length === 0) {
    return { success: false, reason: "NOT_COMPLETED" };
  }

  const allCompleted = user.dailyQuests.quests.every((q) => q.completed);
  // Bonus de 100 pièces et 50 XP supplémentaires si les 3 quêtes sont toutes accomplies !
  const bonusMultiplier = allCompleted ? 1.5 : 1.0;

  let totalCoins = 0;
  let totalXp = 0;

  for (const q of completedQuests) {
    totalCoins += q.rewardCoins || 0;
    totalXp += q.rewardXp || 0;
  }

  totalCoins = Math.round(totalCoins * bonusMultiplier);
  totalXp = Math.round(totalXp * bonusMultiplier);

  user.balance = (user.balance || 0) + totalCoins;
  user.dailyQuests.claimed = true;
  user.markModified("dailyQuests");
  await user.save();

  if (totalXp > 0) {
    await Level.findOneAndUpdate(
      { userId, guildId },
      { $inc: { xp: totalXp } },
      { upsert: true }
    );
  }

  return {
    success: true,
    totalCoins,
    totalXp,
    allCompleted,
    completedCount: completedQuests.length,
  };
}

module.exports = {
  getUserQuests,
  incrementQuestProgress,
  claimQuestRewards,
  getTodayString,
};
