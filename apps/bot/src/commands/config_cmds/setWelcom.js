const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const logger = require("../../utils/logger");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Définir le canal de bienvenue")
    .setDescriptionLocalizations({
      "en-US": "Set the welcome channel",
    })
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Canal pour les messages de bienvenue")
        .setDescriptionLocalizations({
          "en-US": "Channel for welcome messages",
        })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    try {
      await GuildConfiguration.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { welcomeChannel: channel.id },
        { upsert: true },
      );

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(await interaction.t("CONFIG_CMD.WELCOME.TITLE"))
        .setDescription(
          await interaction.t("CONFIG_CMD.WELCOME.DESCRIPTION", {
            channel: `${channel}`,
          }),
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error(
        `Erreur lors de la configuration du canal de bienvenue: ${error}`,
      );
      await interaction.reply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
