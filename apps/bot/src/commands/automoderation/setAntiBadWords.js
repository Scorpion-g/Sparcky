const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setantibadwords")
    .setDescription("Activer ou désactiver l'anti bad words")
    .setDescriptionLocalizations({
      fr: "Activer ou désactiver l'anti bad words",
      "en-US": "Enable or disable anti bad words",
    })
    .addBooleanOption((option) =>
      option
        .setName("etat")
        .setDescription("Activer ou désactiver l'anti bad words")
        .setDescriptionLocalizations({
          fr: "Activer ou désactiver l'anti bad words",
          "en-US": "Enable or disable anti bad words",
        })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const enabled = interaction.options.get("etat").value;

    await interaction.deferReply({ ephemeral: true });

    let guildConfig = await GuildConfiguration.findOne({
      guildId: interaction.guild.id,
    });
    try {
      if (!guildConfig) {
        guildConfig = new GuildConfiguration({
          guildId: interaction.guild.id,
          antiBadWords: enabled,
        });
      } else {
        guildConfig.antiBadWords = enabled;
      }

      await guildConfig.save();

      const embed = new EmbedBuilder()
        .setColor(enabled ? "#00ff99" : "#ff3300")
        .setTitle(
          await interaction.t(
            enabled
              ? "AUTOMOD_CONFIG.ANTIBADWORDS.ENABLED_TITLE"
              : "AUTOMOD_CONFIG.ANTIBADWORDS.DISABLED_TITLE",
          ),
        )
        .setDescription(
          await interaction.t(
            enabled
              ? "AUTOMOD_CONFIG.ANTIBADWORDS.ENABLED_DESC"
              : "AUTOMOD_CONFIG.ANTIBADWORDS.DISABLED_DESC",
          ),
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(error);
      await interaction.editReply(await interaction.t("ERRORS.COMMAND_FAILED"));
    }
  },
};
