const { WebhookClient, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  name: "guildCreate",
  async execute(client, guild) {
    try {
      logger.info(`[GUILD_JOIN] Nouveau serveur rejoint : ${guild.name} (${guild.id}) avec ${guild.memberCount} membres`);

      // 1. Initialiser la configuration par défaut en BDD
      await GuildConfiguration.findOneAndUpdate(
        { guildId: guild.id },
        {
          $setOnInsert: {
            guildId: guild.id,
            guildName: guild.name,
            language: "fr",
            economyEnabled: true,
            automodEnabled: false,
          },
        },
        { upsert: true }
      ).catch((err) => {
        logger.error(`[GUILD_JOIN] Erreur création configuration pour ${guild.id}: ${err.message}`);
      });

      // 2. Récupérer les informations du serveur et du propriétaire
      let ownerInfo = "Inconnu";
      try {
        const owner = await guild.fetchOwner();
        if (owner) {
          ownerInfo = `${owner.user.tag} (\`${owner.id}\`)`;
        }
      } catch {
        ownerInfo = guild.ownerId ? `<@${guild.ownerId}> (\`${guild.ownerId}\`)` : "Non accessible";
      }

      const totalGuilds = client.guilds.cache.size;
      const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);

      // 3. Envoyer l'alerte sur le Webhook Discord (uniquement via variable d'environnement)
      const webhookUrl = process.env.GUILD_LOGS_WEBHOOK_URL;
      if (webhookUrl) {
        const webhookClient = new WebhookClient({ url: webhookUrl });

        const embed = new EmbedBuilder()
          .setColor(0x10b981) // Émeraude / Vert succès
          .setTitle("🎉 Nouveau serveur rejoint Sparcky !")
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
              name: "👑 Propriétaire",
              value: ownerInfo,
              inline: false,
            },
            {
              name: "👥 Membres du serveur",
              value: `**${guild.memberCount.toLocaleString("fr-FR")}** membres`,
              inline: true,
            },
            {
              name: "🌐 Total Sparcky",
              value: `**${totalGuilds}** serveurs • **${totalMembers.toLocaleString("fr-FR")}** membres`,
              inline: true,
            }
          )
          .setFooter({ text: "Sparcky Watchdog • Alerte Nouveaux Serveurs" })
          .setTimestamp();

        await webhookClient.send({
          username: "Sparcky Watchdog",
          avatarURL: client.user?.displayAvatarURL() || undefined,
          embeds: [embed],
        }).catch((err) => {
          logger.error(`[GUILD_JOIN] Erreur envoi webhook: ${err.message}`);
        });
      }
    } catch (error) {
      logger.error(`[GUILD_JOIN] Erreur globale event guildCreate: ${error.stack || error}`);
    }
  },
};
