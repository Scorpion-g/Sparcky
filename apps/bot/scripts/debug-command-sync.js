/*
 * Script de debug: tente de sérialiser toutes les commandes locales et
 * de les enregistrer sur une guild pour identifier précisément
 * la commande/option qui casse la validation Discord (enum/choices/type).
 */
require("dotenv").config();

const { Client, IntentsBitField } = require("discord.js");
const getLocalCommands = require("../src/utils/getLocalCommands");
const getApplicationCommands = require("../src/utils/getApplicationCommands");

const guildId = process.argv[2] || process.env.GUILD_ID;

if (!guildId) {
  console.error("Usage: node scripts/debug-command-sync.js <guildId> (ou GUILD_ID env)");
  process.exit(1);
}

(async () => {
  const client = new Client({
    intents: [IntentsBitField.Flags.Guilds],
  });

  client.once("ready", async () => {
    try {
      const localCommands = getLocalCommands();
      const appCommands = await getApplicationCommands(client, guildId);

      for (const local of localCommands) {
        const payload = local.data.toJSON();
        const existing = appCommands.cache.find((c) => c.name === payload.name);

        try {
          if (existing) {
            await appCommands.edit(existing.id, payload);
          } else {
            await appCommands.create(payload);
          }
          console.log(`OK: ${payload.name}`);
        } catch (e) {
          console.error(`FAIL: ${payload.name}`);
          console.error(e);
          try {
            console.error(JSON.stringify(payload, null, 2));
          } catch (jsonError) {
            console.error("Impossible de sérialiser le payload en JSON:", jsonError);
          }
          process.exitCode = 2;
          break;
        }
      }
    } finally {
      client.destroy();
    }
  });

  await client.login(process.env.TOKEN);
})();
