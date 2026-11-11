const getLocalCommands = require("../../utils/getLocalCommands");
const areCommandsDifferent = require("../../utils/areCommandsDifferent");
const getApplicationCommands = require("../../utils/getApplicationCommands");
const logger = require("../../utils/logger"); // Assure-toi d'avoir ton logger Winston ici
const testServer = process.env.GUILD_ID; // ID du serveur de test pour les commandes guild

module.exports = {
  name: "registerCommands",
  async execute(client) {
    try {
      // Récupérer toutes les commandes locales (dans ton code)
      const localCommands = getLocalCommands();

      // Charger immédiatement toutes les commandes locales dans le client
      for (const cmd of localCommands) {
        if (cmd.data?.name) {
          client.commands.set(cmd.data.name, cmd);
        }
      }

      const isDev = process.env.NODE_ENV !== "production" || process.env.DEV_MODE === "true";

      // Fonction générique de synchro
      async function syncCommands(applicationCommands, scope = "global") {
        if (!applicationCommands) return;

        // --- Supprimer les commandes sur Discord qui n'existent plus localement ---
        for (const appCommand of applicationCommands.cache.values()) {
          const existsLocally = localCommands.some(
            (c) => c.data.name === appCommand.name,
          );

          if (!existsLocally) {
            await applicationCommands.delete(appCommand.id);
            logger.info(`🗑️ Commande supprimée (${scope}): ${appCommand.name}`);
          }
        }

        // --- Créer ou mettre à jour les commandes locales ---
        for (const localCommand of localCommands) {
          const commandData = localCommand.data.toJSON();

          if (!commandData.name) {
            logger.info(`⚠️ Commande ignorée car name manquant:`, localCommand);
            continue;
          }

          // Vérif description (sauf menus contextuels)
          if (commandData.type === 1 && !commandData.description) {
            logger.info(
              `⚠️ Commande slash ignorée car description manquante:`,
              localCommand,
            );
            continue;
          }

          const existingCommand = applicationCommands.cache.find(
            (cmd) => cmd.name === commandData.name,
          );

          try {
            if (existingCommand) {
              if (commandData.type === 2 || commandData.type === 3) {
                await applicationCommands.edit(existingCommand.id, commandData);
                logger.info(
                  `♻️ Commande mise à jour (${scope}): "${commandData.name}"`,
                );
              } else if (areCommandsDifferent(existingCommand, commandData)) {
                await applicationCommands.edit(existingCommand.id, commandData);
                logger.info(
                  `♻️ Commande mise à jour (${scope}): "${commandData.name}"`,
                );
              }
            } else {
              await applicationCommands.create(commandData);
              logger.info(`✨ Commande créée (${scope}): "${commandData.name}"`);
            }
          } catch (err) {
            const msg = `❌ Erreur sync commande (${scope}) name="${commandData.name}" type=${commandData.type}: ${err?.message || err}`;
            logger.error(msg);
            if (process.env.DEBUG_COMMAND_SYNC === "1") {
              console.error(msg);
              try {
                const payload = JSON.stringify(commandData, null, 2);
                logger.error(
                  `[command payload:${scope}:${commandData.name}] ${payload}`,
                );
                console.error(`[command payload:${scope}:${commandData.name}] ${payload}`);
              } catch {
                // ignore
              }
            }
            throw err;
          }
        }
      }

      // Synchro serveur test (instantané pour le développement)
      if (testServer) {
        try {
          const guildCommands = await getApplicationCommands(client, testServer);
          await syncCommands(guildCommands, "guild");
        } catch (guildErr) {
          logger.warn(`Impossible de synchroniser les commandes du serveur test (${testServer}): ${guildErr.message}`);
        }
      }

      // Synchro globales (en prod ou si explicitement demandé)
      if (!isDev || process.env.SYNC_GLOBAL === "true") {
        const globalCommands = await getApplicationCommands(client);
        await syncCommands(globalCommands, "global");
      } else {
        logger.info("ℹ️ Mode dev actif : synchronisation globale ignorée (commandes actives immédiatement sur le serveur test).");
      }

      logger.info("✅ Synchronisation des commandes terminée.");
    } catch (error) {
      logger.error("❌ Erreur lors de la synchronisation des commandes:", error);
    }
  },
};
