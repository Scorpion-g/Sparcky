const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const logger = require("../../utils/logger");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setantiraid")
    .setDescription("Activer ou désactiver le système anti-raid")
    .setDescriptionLocalizations({
      fr: "Activer ou désactiver le système anti-raid",
      "en-US": "Enable or disable anti-raid system",
    })
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Activer ou désactiver l'anti-raid")
        .setDescriptionLocalizations({
          fr: "Activer ou désactiver l'anti-raid",
          "en-US": "Enable or disable anti-raid",
        })
        .setRequired(true)
        .addChoices(
          { name: "activer", name_localizations: { fr: "activer", "en-US": "enable" }, value: "enable" },
          { name: "désactiver", name_localizations: { fr: "désactiver", "en-US": "disable" }, value: "disable" },
        ),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.Administrator)),

  async execute(interaction) {
    const action = interaction.options.getString("action");
    const guildId = interaction.guild.id;

    try {
      let guildConfiguration = await GuildConfiguration.findOne({ guildId });
      if (!guildConfiguration) {
        guildConfiguration = new GuildConfiguration({ guildId });
      }

      const currentConfiguration = !!guildConfiguration.antiRaid;

      if (action === "enable") {
        if (currentConfiguration) {
          return interaction.reply({
            content: await interaction.t("AUTOMOD_CONFIG.ANTIRAID.ALREADY_ENABLED"),
            ephemeral: true,
          });
        }

        guildConfiguration.antiRaid = true;
        await guildConfiguration.save();

        const embed = new EmbedBuilder()
          .setTitle(await interaction.t("AUTOMOD_CONFIG.ANTIRAID.ENABLED_TITLE"))
          .setDescription(await interaction.t("AUTOMOD_CONFIG.ANTIRAID.ENABLED_DESC"))
          .setColor("Green")
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (action === "disable") {
        if (!currentConfiguration) {
          return interaction.reply({
            content: await interaction.t("AUTOMOD_CONFIG.ANTIRAID.ALREADY_DISABLED"),
            ephemeral: true,
          });
        }

        guildConfiguration.antiRaid = false;
        await guildConfiguration.save();

        const embed = new EmbedBuilder()
          .setTitle(await interaction.t("AUTOMOD_CONFIG.ANTIRAID.DISABLED_TITLE"))
          .setDescription(await interaction.t("AUTOMOD_CONFIG.ANTIRAID.DISABLED_DESC"))
          .setColor("Red")
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      return interaction.reply({
        content: await interaction.t("AUTOMOD_CONFIG.ANTIRAID.INVALID_ACTION"),
        ephemeral: true,
      });
    } catch (error) {
      logger.error("Erreur dans la maj de l'antiraid:", error);
      return interaction.reply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
