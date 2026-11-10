const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setantilink")
    .setDescription("Activer ou désactiver l'antilink")
    .setDescriptionLocalizations({
      fr: "Activer ou désactiver l'antilink",
      "en-US": "Enable or disable antilink",
    })
    .addStringOption((option) =>
      option
        .setName("etat")
        .setDescription("Choisir l'état de l'antilink (on/off)")
        .setDescriptionLocalizations({
          fr: "Choisir l'état de l'antilink (on/off)",
          "en-US": "Choose antilink state (on/off)",
        })
        .setRequired(true)
        .addChoices(
          { name: "on", name_localizations: { fr: "on", "en-US": "on" }, value: "on" },
          { name: "off", name_localizations: { fr: "off", "en-US": "off" }, value: "off" },
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
        });
      }

      guildConfig.antilink = etat === "on";
      await guildConfig.save();

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("AUTOMOD_CONFIG.ANTILINK.TITLE"))
        .setDescription(
          await interaction.t(
            etat === "on"
              ? "AUTOMOD_CONFIG.ANTILINK.ENABLED"
              : "AUTOMOD_CONFIG.ANTILINK.DISABLED",
          ),
        )
        .setColor(etat === "on" ? "#00FF00" : "#FF0000");

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error(`Erreur lors de la configuration de l'antilink: ${error}`);
      await interaction.editReply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
      });
    }
  },
};
