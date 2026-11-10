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
  }
};
