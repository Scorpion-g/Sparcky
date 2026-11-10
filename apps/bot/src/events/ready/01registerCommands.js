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

      // Récupérer les commandes du serveur test (rapide pour dev)
      const guildCommands = await getApplicationCommands(client, testServer);

      // Récupérer les commandes globales (partout sur Discord)
      const globalCommands = client.application.commands;

      // Fonction générique de synchro
      async function syncCommands(applicationCommands, scope = "global") {
        // --- Supprimer les commandes sur Discord qui n'existent plus localement ---
        for (const appCommand of applicationCommands.cache.values()) {
          const existsLocally = localCommands.some(
            (c) => c.data.name === appCommand.name,
          );

          if (!existsLocally) {
            await applicationCommands.delete(appCommand.id);
            logger.info(`🗑️ Commande supprimée (${scope}): ${appCommand.name}`);
            client.commands.delete(appCommand.name);
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
              // IMPORTANT: les commandes contextuelles (type 2/3) n'ont pas `description/options`
              // côté API discord.js, ce qui faisait crasher `areCommandsDifferent`.
              // On garde une politique simple: on les met à jour à chaque fois.
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

            client.commands.set(commandData.name, localCommand);
          } catch (err) {
            const msg = `❌ Erreur sync commande (${scope}) name="${commandData.name}" type=${commandData.type}: ${err?.message || err}`;
            logger.error(msg);
            if (process.env.DEBUG_COMMAND_SYNC === "1") {
              // Winston peut ne pas sortir en console selon la config, donc on force aussi la sortie console.
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

      // Synchro serveur test
      await syncCommands(guildCommands, "guild");

      // Synchro globales (⚠️ prend parfois 1h à se propager sur Discord)
      await syncCommands(globalCommands, "global");

      logger.info("✅ Synchronisation complète des commandes terminée.");
    } catch (error) {
      logger.error("❌ Erreur lors de la synchronisation des commandes:", error);
    }
  },
};
