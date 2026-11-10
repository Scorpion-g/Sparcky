const registerCommands = require('./01registerCommands.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'ready', // discord.js v14
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} est en ligne ✔️ !`);

    // Synchronisation automatique des commandes
    await registerCommands.execute(client);
    logger.info('✅ Synchronisation des commandes terminée.');
  }
};
