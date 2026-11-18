const logger = require("../../utils/logger");
const { attachT } = require("../../utils/t");

module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    // Attache le helper i18n
    attachT(interaction);

    // ==========================================
    // 1. GESTION DES BOUTONS
    // ==========================================
    if (interaction.isButton()) {
      if (
        interaction.customId.startsWith("giveaway_join_") ||
        interaction.customId.startsWith("giveaway_enter_")
      ) {
        const { handleGiveawayButton } = require("../../utils/giveawayUtils");
        return handleGiveawayButton(interaction);
      }

      if (interaction.customId.startsWith("role_react_")) {
        const roleId = interaction.customId.replace("role_react_", "");
        const role =
          interaction.guild.roles.cache.get(roleId) ||
          (await interaction.guild.roles.fetch(roleId).catch(() => null));

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
          logger.error("Erreur lors de l'ajout/retrait de rôle :", error);
        }
      }
      return;
    }

    // ==========================================
    // 2. GESTION DES MENUS DÉROULANTS DE RÔLES (SELECT MENU)
    // ==========================================
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("role_select_")) {
      await interaction.deferReply({ ephemeral: true });

      try {
        const member = interaction.member;
        const allOptionRoleIds = interaction.component.options.map((opt) => opt.value);
        const selectedRoleIds = interaction.values;

        const addedRoles = [];
        const removedRoles = [];

        for (const roleId of allOptionRoleIds) {
          const role =
            interaction.guild.roles.cache.get(roleId) ||
            (await interaction.guild.roles.fetch(roleId).catch(() => null));
          if (!role) continue;

          const isSelected = selectedRoleIds.includes(roleId);
          const hasRole = member.roles.cache.has(roleId);

          if (isSelected && !hasRole) {
            await member.roles.add(role).catch((err) => {
              logger.warn(`Impossible d'ajouter le rôle ${role.name}: ${err?.message}`);
            });
            addedRoles.push(role.name);
          } else if (!isSelected && hasRole) {
            await member.roles.remove(role).catch((err) => {
              logger.warn(`Impossible de retirer le rôle ${role.name}: ${err?.message}`);
            });
            removedRoles.push(role.name);
          }
        }

        let replyMsg = "✅ **Vos rôles ont été mis à jour avec succès !**\n";
        if (addedRoles.length > 0) {
          replyMsg += `• ➕ **Ajouté(s) :** ${addedRoles.join(", ")}\n`;
        }
        if (removedRoles.length > 0) {
          replyMsg += `• ➖ **Retiré(s) :** ${removedRoles.join(", ")}\n`;
        }
        if (addedRoles.length === 0 && removedRoles.length === 0) {
          replyMsg += `• *Aucune modification apportée à vos rôles.*`;
        }

        return interaction.editReply({ content: replyMsg });
      } catch (error) {
        logger.error("[ROLE_SELECT] Erreur traitement select menu rôles:", error);
        return interaction.editReply({
          content: "❌ Une erreur est survenue lors de la mise à jour de vos rôles.",
        });
      }
    }
  },
};
