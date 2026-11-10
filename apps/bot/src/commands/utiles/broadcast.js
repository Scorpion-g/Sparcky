const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { CURRENT_VERSION, CHANGELOGS } = require("@sparcky/database");
const { broadcastRelease } = require("../../utils/broadcastUtils");
const logger = require("../../utils/logger");

const BOT_OWNER_IDS = ["857574003162349588", "313768826477150218"];

function isAuthorizedOwner(client, user) {
  if (BOT_OWNER_IDS.includes(user.id)) return true;
  const app = client.application;
  if (app?.owner) {
    if (app.owner.id === user.id) return true;
    if (app.owner.members?.some((m) => m.user.id === user.id)) return true;
  }
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("Diffuser une annonce de mise à jour sur tous les serveurs du bot (Owner)")
    .setDescriptionLocalizations({
      "en-US": "Broadcast an update announcement to all bot servers (Owner only)",
    })
    .addBooleanOption((opt) =>
      opt
        .setName("force")
        .setDescription("Forcer l'envoi même si cette version a déjà été diffusée sur le serveur")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("version")
        .setDescription(`Version à annoncer (défaut: ${CURRENT_VERSION})`)
        .setRequired(false)
    ),

  async execute(interaction, client) {
    if (!isAuthorizedOwner(client, interaction.user)) {
      return interaction.reply({
        content: "⛔ Cette commande est strictement réservée au développeur et propriétaire du bot.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const force = interaction.options.getBoolean("force") || false;
    const version = interaction.options.getString("version") || CURRENT_VERSION;

    try {
      const results = await broadcastRelease(client, {
        version,
        force,
        requestedBy: `${interaction.user.tag} (${interaction.user.id})`,
      });

      const reportEmbed = new EmbedBuilder()
        .setColor(results.sentCount > 0 ? "#10B981" : "#F59E0B")
        .setTitle(`📢 Rapport de Diffusion : Version v${results.version}`)
        .setDescription(
          `La diffusion globale vers tous les serveurs connectés est terminée.\n\n` +
          `• 🎯 **Total serveurs :** \`${results.totalGuilds}\`\n` +
          `• ✅ **Diffusés avec succès :** \`${results.sentCount}\`\n` +
          `• ⏩ **Ignorés (déjà reçus) :** \`${results.skippedCount}\`\n` +
          `• ❌ **Échecs / Permissions :** \`${results.failedCount}\``
        )
        .setTimestamp();

      const detailsLines = results.details.map((d) => {
        if (d.status === "sent") return `✅ **${d.guildName}** ➔ #${d.channelName}`;
        if (d.status === "skipped") return `⏩ **${d.guildName}** ➔ *${d.reason}*`;
        return `❌ **${d.guildName}** ➔ *${d.reason}*`;
      });

      if (detailsLines.length > 0) {
        reportEmbed.addFields({
          name: "Détails par serveur",
          value: detailsLines.slice(0, 20).join("\n") || "Aucun détail.",
        });
      }

      await interaction.editReply({ embeds: [reportEmbed] });
    } catch (err) {
      logger.error(`Erreur dans la commande /broadcast: ${err?.message}`);
      await interaction.editReply({
        content: `❌ Une erreur critique est survenue lors de la diffusion : \`${err?.message}\``,
      });
    }
  },
};
