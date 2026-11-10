const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setantispam")
    .setDescription("Activer ou désactiver l'antispam")
    .setDescriptionLocalizations({
      fr: "Activer ou désactiver l'antispam",
      "en-US": "Enable or disable antispam",
    })
    .addStringOption((option) =>
      option
        .setName("etat")
        .setDescription("Choisir l'état de l'antispam")
        .setDescriptionLocalizations({
          fr: "Choisir l'état de l'antispam",
          "en-US": "Choose antispam state",
        })
        .setRequired(true)
        .addChoices(
          { name: "activer", name_localizations: { fr: "activer", "en-US": "enable" }, value: "on" },
          { name: "désactiver", name_localizations: { fr: "désactiver", "en-US": "disable" }, value: "off" },
        ),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),
  async execute(interaction) {
    const etat = interaction.options.getString("etat");

    await interaction.deferReply({ ephemeral: true });

    try {
      let guildConfig = await GuildConfiguration.findOne({
        guildId: interaction.guild.id,
      });

      if (!guildConfig) {
        guildConfig = new GuildConfiguration({
          guildId: interaction.guild.id,
          antispam: etat === "on",
        });
      } else {
        guildConfig.antispam = etat === "on";
      }

      await guildConfig.save();

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(await interaction.t("AUTOMOD_CONFIG.ANTISPAM.TITLE"))
        .setDescription(
          await interaction.t(
            etat === "on"
              ? "AUTOMOD_CONFIG.ANTISPAM.ENABLED"
              : "AUTOMOD_CONFIG.ANTISPAM.DISABLED",
          ),
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error(`Erreur lors de la configuration de l'antispam: ${error}`);
      await interaction.editReply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
