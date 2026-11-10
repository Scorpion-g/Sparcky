const logger = require("../../utils/logger"); // Assure-toi d'avoir ton logger Winston ici
const { attachT } = require("../../utils/t");
module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    // Attache le helper i18n
    attachT(interaction);

    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("role_react_")) {
      const roleId = interaction.customId.replace("role_react_", "");
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        return interaction.reply({
          content: await interaction.t("ERRORS.ROLE_NOT_FOUND"),
          ephemeral: true,
        });
      }

      try {
        if (interaction.member.roles.cache.has(role.id)) {
          await interaction.member.roles.remove(role);
          await interaction.reply({
            content: await interaction.t("SUCCESS.ROLE_REMOVED", {
              role: role.name,
            }),
            ephemeral: true,
          });
        } else {
          await interaction.member.roles.add(role);
          await interaction.reply({
            content: await interaction.t("SUCCESS.ROLE_ADDED", {
              role: role.name,
            }),
            ephemeral: true,
          });
        }
      } catch (error) {
        await interaction.reply({
          content: await interaction.t("ERRORS.CANNOT_EDIT_ROLES"),
          ephemeral: true,
        });
        logger.error("Erreur lors de l'ajout/retrait de rle :", error);
      }
    }
  },
};
