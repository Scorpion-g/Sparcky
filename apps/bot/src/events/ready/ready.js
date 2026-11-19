const registerCommands = require('./01registerCommands.js');
const logger = require('../../utils/logger');
const { CURRENT_VERSION } = require('@sparcky/database');
const { broadcastRelease } = require('../../utils/broadcastUtils');
const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready', // discord.js v14
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} est en ligne ✔️ ! (Version v${CURRENT_VERSION})`);

    // Statut Discord avec la version
    try {
      client.user.setPresence({
        activities: [{ name: `v${CURRENT_VERSION} • sparcky.matteoriviere.fr`, type: ActivityType.Custom }],
        status: 'online',
      });
    } catch (e) {
      logger.warn(`Impossible de définir la présence: ${e?.message}`);
    }

    // Synchronisation automatique des commandes
    await registerCommands.execute(client);
    logger.info('✅ Synchronisation des commandes terminée.');

    // Vérification et clôture automatique des giveaways arrivés à expiration
    const { checkActiveGiveaways } = require('../../utils/giveawayUtils');
    checkActiveGiveaways(client).catch((err) => {
      logger.error(`Erreur checkActiveGiveaways initial: ${err?.message}`);
    });
    setInterval(() => {
      checkActiveGiveaways(client).catch((err) => {
        logger.error(`Erreur interval checkActiveGiveaways: ${err?.message}`);
      });
    }, 15000);

    // Vérification et diffusion des alertes YouTube & Twitch
    const { checkSocialIntegrations } = require('../../utils/socialIntegrationUtils');
    setTimeout(() => {
      checkSocialIntegrations(client).catch((err) => {
        logger.error(`Erreur checkSocialIntegrations initial: ${err?.message}`);
      });
    }, 5000);
    setInterval(() => {
      checkSocialIntegrations(client).catch((err) => {
        logger.error(`Erreur interval checkSocialIntegrations: ${err?.message}`);
      });
    }, 60000);

    // Vérification et tirages automatiques des Loteries Communautaires
    const { checkActiveLotteries } = require('../../utils/lotteryUtils');
    setTimeout(() => {
      checkActiveLotteries(client).catch((err) => {
        logger.error(`Erreur checkActiveLotteries initial: ${err?.message}`);
      });
    }, 10000);
    setInterval(() => {
      checkActiveLotteries(client).catch((err) => {
        logger.error(`Erreur interval checkActiveLotteries: ${err?.message}`);
      });
    }, 60000); // Chaque minute

    // Mise à jour périodique des Salons Statistiques Vocaux (Voice Counters)
    const { updateAllVoiceCounters } = require('../../utils/counterUtils');
    setTimeout(() => {
      updateAllVoiceCounters(client).catch((err) => {
        logger.error(`Erreur updateAllVoiceCounters initial: ${err?.message}`);
      });
    }, 12000);
    setInterval(() => {
      updateAllVoiceCounters(client).catch((err) => {
        logger.error(`Erreur interval updateAllVoiceCounters: ${err?.message}`);
      });
    }, 5 * 60 * 1000); // Toutes les 5 minutes (protection rate limits Discord)

    // Diffusion automatique des mises à jour majeures si activé
    if (process.env.AUTO_BROADCAST_UPDATES === "true") {
      setTimeout(async () => {
        try {
          await broadcastRelease(client, { force: false, requestedBy: "AutoStartup" });
        } catch (err) {
          logger.error(`Erreur auto-broadcast: ${err?.message}`);
        }
      }, 10000); // 10s après le démarrage
    }

    // Lancement automatique de la Question du Jour (QOTD Trivia)
    const { postDailyTrivia } = require('../../utils/qotdTrivia');
    const GuildConfiguration = require('../../models/GuildConfiguration');

    async function checkDailyTrivia() {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        for (const guild of client.guilds.cache.values()) {
          const cfg = await GuildConfiguration.findOne({ guildId: guild.id }).lean();
          if (cfg?.trivia?.enabled !== false && cfg?.trivia?.lastQuestionDate !== todayStr) {
            await postDailyTrivia(client, guild.id);
          }
        }
      } catch (err) {
        logger.error(`Erreur checkDailyTrivia: ${err?.message}`);
      }
    }

    setTimeout(() => checkDailyTrivia(), 15000);
    setInterval(() => checkDailyTrivia(), 60 * 60 * 1000); // Vérification horaire
  }
};
