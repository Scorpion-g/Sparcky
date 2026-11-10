const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const logger = require("../../utils/logger");

const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setautosanction")
    .setDescription("Activer ou désactiver la sanction automatique")
    .setDescriptionLocalizations({
      fr: "Activer ou désactiver la sanction automatique",
      "en-US": "Enable or disable automatic sanction",
    })
    .addBooleanOption((option) =>
      option
        .setName("etat")
        .setDescription("Activer ou désactiver la sanction automatique")
        .setDescriptionLocalizations({
          fr: "Activer ou désactiver la sanction automatique",
          "en-US": "Enable or disable automatic sanction",
        })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const enabled = interaction.options.get("etat").value;
    try {
      await interaction.deferReply({ ephemeral: true });

      let guildConfig = await GuildConfiguration.findOne({
        guildId: interaction.guild.id,
      });

      if (!guildConfig) {
        guildConfig = new GuildConfiguration({
          guildId: interaction.guild.id,
          autoSanction: enabled,
        });
      } else {
        guildConfig.autoSanction = enabled;
      }

      await guildConfig.save();

      const embed = new EmbedBuilder()
        .setColor(enabled ? "#00ff99" : "#ff3300")
        .setTitle(
          await interaction.t(
            enabled
              ? "AUTOMOD_CONFIG.AUTOSANCTION.ENABLED_TITLE"
              : "AUTOMOD_CONFIG.AUTOSANCTION.DISABLED_TITLE",
          ),
        )
        .setDescription(
          await interaction.t(
            enabled
              ? "AUTOMOD_CONFIG.AUTOSANCTION.ENABLED_DESC"
              : "AUTOMOD_CONFIG.AUTOSANCTION.DISABLED_DESC",
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
