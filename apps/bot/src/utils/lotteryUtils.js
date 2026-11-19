const Lottery = require("../models/Lottery");
const User = require("../models/User");
const GuildConfiguration = require("../models/GuildConfiguration");
const logger = require("./logger");
const { EmbedBuilder } = require("discord.js");

/**
 * Calcule la date du prochain dimanche à 20h00
 */
function getNextSunday20h() {
  const d = new Date();
  const day = d.getDay(); // 0 = dimanche
  const daysUntilSunday = (7 - day) % 7;
  const target = new Date(d);
  target.setDate(d.getDate() + (daysUntilSunday === 0 && d.getHours() >= 20 ? 7 : daysUntilSunday));
  target.setHours(20, 0, 0, 0);
  return target;
}

/**
 * Récupère ou initialise la loterie active pour une guilde
 */
async function getActiveLottery(guildId, defaultPrice = 50) {
  let lotto = await Lottery.findOne({ guildId, isEnded: false });
  if (!lotto) {
    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    const ticketPrice = guildConfig?.lottery?.ticketPrice || defaultPrice;
    const endTime = getNextSunday20h();

    lotto = new Lottery({
      guildId,
      ticketPrice,
      jackpot: 0,
      tickets: [],
      endTime,
      isEnded: false,
    });
    await lotto.save();
  }
  return lotto;
}

/**
 * Achète un ou plusieurs tickets de loterie
 */
async function buyTickets(userId, guildId, count = 1) {
  const lotto = await getActiveLottery(guildId);
  const totalCost = count * lotto.ticketPrice;

  const user = await User.findOne({ userId, guildId });
  if (!user || (user.balance || 0) < totalCost) {
    return {
      success: false,
      reason: "INSUFFICIENT_FUNDS",
      needed: totalCost,
      balance: user?.balance || 0,
    };
  }

  // Déduit le coût du solde
  user.balance -= totalCost;
  await user.save();

  // Ajoute au jackpot et enregistre les tickets
  const existingIndex = lotto.tickets.findIndex((t) => t.userId === userId);
  if (existingIndex !== -1) {
    lotto.tickets[existingIndex].count += count;
  } else {
    lotto.tickets.push({ userId, count });
  }

  lotto.jackpot += totalCost;
  await lotto.save();

  const userTotalTickets = lotto.tickets.find((t) => t.userId === userId)?.count || count;
  const totalTickets = lotto.tickets.reduce((acc, t) => acc + t.count, 0);

  return {
    success: true,
    ticketsBought: count,
    userTotalTickets,
    totalTickets,
    cost: totalCost,
    jackpot: lotto.jackpot,
    endTime: lotto.endTime,
  };
}

/**
 * Effectue le tirage au sort d'une loterie
 */
async function drawLottery(client, lottoDoc) {
  try {
    const lotto = lottoDoc._id ? lottoDoc : await Lottery.findById(lottoDoc);
    if (!lotto || lotto.isEnded) return null;

    const guild = client.guilds.cache.get(lotto.guildId);
    const totalTickets = lotto.tickets.reduce((acc, t) => acc + t.count, 0);

    if (totalTickets === 0 || lotto.jackpot === 0) {
      // Aucun ticket vendu : on reporte le tirage de 3 jours
      lotto.endTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await lotto.save();
      logger.info(`[LOTTERY] Aucun participant pour ${lotto.guildId}, tirage reporté.`);
      return { success: false, reason: "NO_PARTICIPANTS" };
    }

    // Création de l'urne pondérée
    const pool = [];
    for (const t of lotto.tickets) {
      for (let i = 0; i < t.count; i++) {
        pool.push(t.userId);
      }
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const winnerId = pool[randomIndex];
    const jackpotWon = lotto.jackpot;

    // Crédite le gagnant
    await User.findOneAndUpdate(
      { userId: winnerId, guildId: lotto.guildId },
      { $inc: { balance: jackpotWon } },
      { upsert: true }
    );

    // Clôture la loterie
    lotto.isEnded = true;
    lotto.winnerId = winnerId;
    lotto.history.push({
      winnerId,
      jackpot: jackpotWon,
      ticketCount: totalTickets,
      endedAt: new Date(),
    });
    await lotto.save();

    // Crée immédiatement la prochaine session de loterie
    const newEndTime = getNextSunday20h();
    const nextLotto = new Lottery({
      guildId: lotto.guildId,
      ticketPrice: lotto.ticketPrice,
      jackpot: 0,
      tickets: [],
      endTime: newEndTime,
      isEnded: false,
    });
    await nextLotto.save();

    // Annonce publique du vainqueur
    const guildConfig = await GuildConfiguration.findOne({ guildId: lotto.guildId }).lean();
    const announceChannelId = guildConfig?.lottery?.channelId || guildConfig?.announcementChannel;
    const channel = announceChannelId ? guild?.channels?.cache?.get(announceChannelId) : null;

    if (channel && channel.isTextBased()) {
      const winnerMember = await guild.members.fetch(winnerId).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle("🎰 TIRAGE DE LA LOTERIE COMMUNAUTAIRE !")
        .setDescription(
          `Le tirage au sort vient d'avoir lieu parmi les **${totalTickets} tickets** en jeu !\n\n` +
          `👑 **Grand Vainqueur :** <@${winnerId}>\n` +
          `💰 **Jackpot Empoché :** **${jackpotWon.toLocaleString()} pièces** ! 🪙\n\n` +
          `🎉 Le pactole a été directement versé sur son solde !\n` +
          `Une nouvelle session est ouverte dès maintenant : tapez \`/loterie buy\` pour tenter votre chance au prochain tirage !`
        )
        .setThumbnail(winnerMember?.user?.displayAvatarURL() || null)
        .setTimestamp();

      await channel.send({ content: `🎉 Félicitations <@${winnerId}> !`, embeds: [embed] }).catch(() => {});
    }

    logger.info(`[LOTTERY] Vainqueur tiré pour ${lotto.guildId}: ${winnerId} remporte ${jackpotWon} coins (${totalTickets} tickets)`);
    return {
      success: true,
      winnerId,
      jackpot: jackpotWon,
      totalTickets,
    };
  } catch (err) {
    logger.error(`[LOTTERY] Erreur drawLottery: ${err.message}`);
    return null;
  }
}

/**
 * Vérifie toutes les loteries expirées et exécute les tirages
 */
async function checkActiveLotteries(client) {
  try {
    const now = new Date();
    const expired = await Lottery.find({
      isEnded: false,
      endTime: { $lte: now },
    });

    for (const lotto of expired) {
      await drawLottery(client, lotto);
    }
  } catch (err) {
    logger.error(`[LOTTERY] Erreur checkActiveLotteries: ${err.message}`);
  }
}

module.exports = {
  getNextSunday20h,
  getActiveLottery,
  buyTickets,
  drawLottery,
  checkActiveLotteries,
};
