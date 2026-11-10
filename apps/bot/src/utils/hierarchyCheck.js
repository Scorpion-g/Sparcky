/**
 * Vérifie la hiérarchie des rôles entre l'exécuteur, le bot et la cible
 * pour éviter les erreurs Discord (50013 Missing Permissions) et les abus.
 */
function checkRoleHierarchy(interaction, targetMember) {
  if (!targetMember) {
    return { canAct: true };
  }

  const executor = interaction.member;
  const botMember = interaction.guild.members.me;

  // Impossible de cibler le propriétaire du serveur
  if (targetMember.id === interaction.guild.ownerId) {
    return {
      canAct: false,
      reason: "Impossible d'effectuer cette action sur le **propriétaire du serveur**."
    };
  }

  // Impossible de se sanctionner soi-même
  if (targetMember.id === executor.id) {
    return {
      canAct: false,
      reason: "Vous ne pouvez pas effectuer cette action sur **vous-même**."
    };
  }

  // Vérification de l'exécuteur (sauf si c'est le propriétaire du serveur)
  if (executor.id !== interaction.guild.ownerId) {
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
      return {
        canAct: false,
        reason: "Vous ne pouvez pas sanctionner ce membre car son rôle est **supérieur ou égal** au vôtre."
      };
    }
  }

  // Vérification du bot
  if (botMember && targetMember.roles.highest.position >= botMember.roles.highest.position) {
    return {
      canAct: false,
      reason: "Je ne peux pas sanctionner ce membre car son rôle le plus élevé est **supérieur ou égal** au mien."
    };
  }

  return { canAct: true };
}

module.exports = {
  checkRoleHierarchy
};
