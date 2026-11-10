const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../../utils/logger");
const { COLORS, createSparkyEmbed } = require("../../utils/theme");

module.exports = {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprimer rapidement des messages d'un salon")
    .setDescriptionLocalizations({
      fr: "Supprimer rapidement des messages d'un salon",
      "en-US": "Quickly delete messages from a channel",
      "es-ES": "Eliminar rápidamente mensajes de un canal",
    })
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setDescriptionLocalizations({
          fr: "Nombre de messages à supprimer (1-100)",
          "en-US": "Number of messages to delete (1-100)",
          "es-ES": "Número de mensajes a eliminar (1-100)",
        })
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Filtrer pour ne supprimer que les messages de cet utilisateur")
        .setDescriptionLocalizations({
          fr: "Filtrer pour ne supprimer que les messages de cet utilisateur",
          "en-US": "Filter to only delete messages from this user",
          "es-ES": "Filtrar para eliminar solo los mensajes de este usuario",
        })
        .setRequired(false),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageMessages)),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const targetUser = interaction.options.getUser("user");

    await interaction.deferReply({ ephemeral: true });

    try {
      let messagesToDelete;
      if (targetUser) {
        const fetched = await interaction.channel.messages.fetch({ limit: 100 });
        const userMessages = fetched
          .filter((m) => m.author.id === targetUser.id)
          .first(amount);
        messagesToDelete = userMessages;
      } else {
        messagesToDelete = amount;
      }

      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

      const targetDesc = targetUser ? ` de ${targetUser}` : "";
      const embed = createSparkyEmbed({
        title: "🧹 Nettoyage réussi",
        description: `**${deleted.size}** message(s)${targetDesc} ont été supprimés avec succès.`,
        color: COLORS.SUCCESS,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[CLEAR] Erreur suppression: ${err?.message}`);
      const errEmbed = createSparkyEmbed({
        title: "❌ Erreur",
        description: "Impossible de supprimer ces messages (les messages datant de plus de 14 jours ne peuvent pas être supprimés en masse).",
        color: COLORS.DANGER,
      });
      await interaction.editReply({ embeds: [errEmbed] });
    }
  },
};
