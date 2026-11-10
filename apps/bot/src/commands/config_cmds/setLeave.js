const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const logger = require("../../utils/logger");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setleave")
    .setDescription("Définir le canal d'au revoir")
    .setDescriptionLocalizations({
      "en-US": "Set the leave channel",
    })
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Canal pour les messages d'au revoir")
        .setDescriptionLocalizations({
          "en-US": "Channel for leave messages",
        })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    try {
      await GuildConfiguration.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { leaveChannel: channel.id },
        { upsert: true },
      );

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(await interaction.t("CONFIG_CMD.LEAVE.TITLE"))
        .setDescription(
          await interaction.t("CONFIG_CMD.LEAVE.DESCRIPTION", {
            channel: `${channel}`,
          }),
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error(
        `Erreur lors de la configuration du canal d'aurevoir: ${error}`,
      );
      await interaction.reply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
