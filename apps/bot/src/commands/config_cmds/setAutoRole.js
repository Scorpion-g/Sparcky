const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const logger = require("../../utils/logger");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setautorole")
    .setDescription("Définir le rôle automatique pour les nouveaux membres")
    .setDescriptionLocalizations({
      "en-US": "Set the automatic role for new members",
    })
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Rôle à attribuer automatiquement aux nouveaux membres")
        .setDescriptionLocalizations({
          "en-US": "Role to automatically assign to new members",
        })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),

  async execute(interaction) {
    const role = interaction.options.getRole("role");
    try {
      await GuildConfiguration.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { autoRole: role.id },
        { upsert: true },
      );

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(await interaction.t("CONFIG_CMD.AUTOROLE.TITLE"))
        .setDescription(
          await interaction.t("CONFIG_CMD.AUTOROLE.DESCRIPTION", { role: `${role}` }),
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error(
        `Erreur lors de la configuration du rôle automatique: ${error}`,
      );
      await interaction.reply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
