const { SlashCommandBuilder,EmbedBuilder,PermissionFlagsBits } = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Définir le channel de log")
    .setDescriptionLocalizations({
      fr: "Définir le channel de log",
      "en-US": "Set the log channel",
    })
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Le channel où les logs seront envoyés")
        .setDescriptionLocalizations({
          fr: "Le channel où les logs seront envoyés",
          "en-US": "Channel where logs will be sent",
        })
        .setRequired(true)
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    if (channel.type !== 0) {
      return interaction.reply({
        content: await interaction.t("AUTOMOD_CONFIG.LOGCHANNEL.INVALID_CHANNEL"),
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let guildConfig = await GuildConfiguration.findOne({
        guildId: interaction.guild.id,
      });

      if (!guildConfig) {
        guildConfig = new GuildConfiguration({
          guildId: interaction.guild.id,
          modLogChannel: channel.id,
        });
      } else {
        guildConfig.modLogChannel = channel.id;
      }

      await guildConfig.save();

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("AUTOMOD_CONFIG.LOGCHANNEL.TITLE"))
        .setDescription(
          await interaction.t("AUTOMOD_CONFIG.LOGCHANNEL.DESCRIPTION", {
            channel: `${channel}`,
          }),
        )
        .setColor("#0099ff")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error(`Erreur lors de la configuration du channel de log: ${error}`);
      await interaction.editReply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
