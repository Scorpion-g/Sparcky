const { WebhookClient, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  name: "guildDelete",
  async execute(client, guild) {
    try {
      logger.info(`[GUILD_LEAVE] Serveur retiré : ${guild.name} (${guild.id})`);

      const totalGuilds = client.guilds.cache.size;
      const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);

      const webhookUrl = process.env.GUILD_LOGS_WEBHOOK_URL;
      if (webhookUrl) {
        const webhookClient = new WebhookClient({ url: webhookUrl });

        const embed = new EmbedBuilder()
          .setColor(0xef4444) // Rouge alerte
          .setTitle("👋 Sparcky a quitté un serveur")
          .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
          .addFields(
            {
              name: "📌 Nom du serveur",
              value: `**${guild.name}**`,
              inline: true,
            },
            {
              name: "🆔 ID du serveur",
              value: `\`${guild.id}\``,
              inline: true,
            },
            {
              name: "👥 Membres perdus",
              value: `**${(guild.memberCount || 0).toLocaleString("fr-FR")}** membres`,
              inline: true,
            },
            {
              name: "🌐 Total restant",
              value: `**${totalGuilds}** serveurs • **${totalMembers.toLocaleString("fr-FR")}** membres`,
              inline: false,
            }
          )
          .setFooter({ text: "Sparcky Watchdog • Alerte Retraits" })
          .setTimestamp();

        await webhookClient.send({
          username: "Sparcky Watchdog",
          avatarURL: client.user?.displayAvatarURL() || undefined,
          embeds: [embed],
        }).catch((err) => {
          logger.error(`[GUILD_LEAVE] Erreur envoi webhook: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error(`[GUILD_LEAVE] Erreur globale event guildDelete: ${error.stack || error}`);
    }
  },
};
