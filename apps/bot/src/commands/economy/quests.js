const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getUserQuests, claimQuestRewards } = require("../../utils/questUtils");

/**
 * Génère une barre de progression textuelle propre (ex: [▰▰▰▱▱] 60%)
 */
function makeProgressBar(current, target, length = 10) {
  const ratio = Math.min(1, Math.max(0, current / target));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  const bar = "▰".repeat(filled) + "▱".repeat(empty);
  const percent = Math.round(ratio * 100);
  return `\`[${bar}]\` **${current}/${target}** (${percent}%)`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quests")
    .setDescription("Consulter et réclamer vos quêtes quotidiennes.")
    .setDescriptionLocalizations({
      "en-US": "View and claim your daily quests.",
    })
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("Afficher vos 3 quêtes du jour et votre progression.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("claim")
        .setDescription("Réclamer les récompenses de vos quêtes complétées.")
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande doit être exécutée sur un serveur.",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand() || "view";
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (subcommand === "claim") {
      await interaction.deferReply();
      const result = await claimQuestRewards(userId, guildId);

      if (!result.success) {
        if (result.reason === "ALREADY_CLAIMED") {
          return interaction.editReply({
            content: "⏳ Vous avez déjà réclamé vos récompenses de quêtes pour aujourd'hui ! Revenez demain.",
          });
        }
        if (result.reason === "NOT_COMPLETED") {
          return interaction.editReply({
            content: "⚠️ Vous n'avez pas encore terminé de quête aujourd'hui ! Tapez `/quests view` pour voir vos objectifs.",
          });
        }
        return interaction.editReply({
          content: "❌ Aucune quête active trouvée. Tapez `/quests view` pour les générer.",
        });
      }

      const bonusNotice = result.allCompleted
        ? "\n🌟 **Grand Chelem Réussi !** Bonus de **+50%** appliqué sur tous vos gains !"
        : "";

      return interaction.editReply({
        content: `🎉 Félicitations <@${userId}> !\nVous avez validé **${result.completedCount} quête(s)** et remporté :\n💰 **+${result.totalCoins} pièces**\n⭐ **+${result.totalXp} points d'XP**${bonusNotice}`,
      });
    }

    // Subcommand: "view"
    await interaction.deferReply();
    const questData = await getUserQuests(userId, guildId);
    const quests = questData.quests || [];

    const embed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle("📜 Quêtes Quotidiennes")
      .setDescription(
        `Chaque jour, relevez ces 3 défis pour gagner des pièces et de l'XP !\n` +
        `Accomplissez les 3 quêtes pour débloquer le **Bonus Grand Chelem (+50%)** !\n` +
        `*(Réinitialisation chaque jour à minuit UTC)*\n\n`
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    let hasCompletable = false;

    for (const [index, q] of quests.entries()) {
      const isDone = q.completed;
      const statusIcon = isDone ? "✅" : "⏳";
      const progressText = isDone
        ? "✅ **Complétée !**"
        : makeProgressBar(q.progress || 0, q.target);

      if (isDone && !questData.claimed) {
        hasCompletable = true;
      }

      embed.addFields({
        name: `${statusIcon} Défi #${index + 1} : ${q.title}`,
        value: `${q.description}\n${progressText}\n🎁 Récompense : \`+${q.rewardCoins} 🪙\` & \`+${q.rewardXp} XP\`\n`,
        inline: false,
      });
    }

    let footerText = "Tapez /quests claim pour réclamer vos récompenses !";
    if (questData.claimed) {
      footerText = "✔️ Récompenses du jour déjà réclamées !";
      embed.setColor(0x10B981);
    }
    embed.setFooter({ text: footerText });

    const components = [];
    if (!questData.claimed && hasCompletable) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("quest_claim_btn")
          .setLabel("Réclamer les récompenses")
          .setEmoji("🎁")
          .setStyle(ButtonStyle.Success)
      );
      components.push(row);
    }

    return interaction.editReply({
      embeds: [embed],
      components,
    });
  },
};
