const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delmess")
    .setDescription("Supprimer des messages")
    .setDescriptionLocalizations({
      "en-US": "Delete messages",
    })
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setDescriptionLocalizations({
          "en-US": "Number of messages to delete (1-100)",
        })
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageMessages)),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount");

    try {
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(await interaction.t("UTILES.DELMESS.TITLE"))
        .setDescription(await interaction.t("UTILES.DELMESS.PROGRESS", { amount }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      const deletedMessages = await interaction.channel.bulkDelete(amount, true);
      await interaction.editReply({
        content: await interaction.t("UTILES.DELMESS.SUCCESS", {
          count: deletedMessages.size,
        }),
        embeds: [],
        ephemeral: true,
      });
    } catch (error) {
      logger.error(`Erreur lors de la suppression des messages: ${error}`);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: await interaction.t("ERRORS.COMMAND_FAILED"),
          embeds: [],
        });
      } else {
        await interaction.reply({
          content: await interaction.t("ERRORS.COMMAND_FAILED"),
          ephemeral: true,
        });
      }
    }
  },
};
