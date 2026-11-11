const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const User = require("../../models/User");
const Level = require("../../models/Level");
const GuildConfiguration = require("../../models/GuildConfiguration");
const calculateLevelXp = require("../../utils/calculateLevelXp");
const logger = require("../../utils/logger");
const { COLORS } = require("../../utils/theme");

const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 heures
const VOTE_REWARD_COINS = 1000;
const VOTE_REWARD_XP = 500;

/**
 * Vérifie auprès de l'API Top.gg si l'utilisateur a voté (si token configuré)
 */
async function checkTopGgVote(botId, userId) {
  const token = process.env.TOPGG_TOKEN;
  if (!token) return null; // Pas de token configuré, fallback sur cooldown local

  try {
    const res = await fetch(`https://top.gg/api/bots/${botId}/check?userId=${userId}`, {
      headers: {
        Authorization: token,
      },
    });
    if (!res.ok) {
      logger.warn(`[VOTE] Erreur API Top.gg HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data?.voted === 1;
  } catch (err) {
    logger.warn(`[VOTE] Impossible de joindre l'API Top.gg: ${err.message}`);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Voter pour Sparcky sur Top.gg et récupérer vos récompenses (1 000 pièces & 500 XP).")
    .setDescriptionLocalizations({
      "en-US": "Vote for Sparcky on Top.gg and claim your rewards (1,000 coins & 500 XP).",
    }),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: (await interaction.t?.("ERRORS.GUILD_ONLY")) || "Cette commande doit être exécutée sur un serveur.",
        ephemeral: true,
      });
    }

    try {
      const guildConfig = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
      if (guildConfig && guildConfig.economyEnabled === false) {
        return interaction.reply({
          content: "❌ Le système d'économie est actuellement désactivé sur ce serveur.",
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      const clientId = interaction.client.user?.id || process.env.CLIENT_ID || "1275197373580050604";
      const topggVoteUrl = `https://top.gg/bot/${clientId}/vote`;
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
      const currencySymbol = guildConfig?.currencySymbol || "$";

      const query = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      };

      let user = await User.findOne(query);
      const now = Date.now();
      let canClaim = true;
      let nextVoteTimestamp = 0;

      if (user && user.lastVote) {
        const lastVoteTime = new Date(user.lastVote).getTime();
        const diff = now - lastVoteTime;
        if (diff < VOTE_COOLDOWN_MS) {
          canClaim = false;
          nextVoteTimestamp = Math.floor((lastVoteTime + VOTE_COOLDOWN_MS) / 1000);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS?.PRIMARY || 0x6366f1)
        .setTitle("⭐ Soutenir Sparcky sur Top.gg")
        .setDescription(
          `Votez pour **Sparcky** sur Top.gg pour faire monter le bot dans le classement et débloquer des récompenses exclusives !\n\n` +
          `🎁 **Récompenses de vote :**\n` +
          `• **+${VOTE_REWARD_COINS} ${currencySymbol}** ajoutés à votre solde\n` +
          `• **+${VOTE_REWARD_XP} ⭐ XP** pour progresser dans vos niveaux\n` +
          `• Récompense récupérable **toutes les 12 heures**\n\n` +
          (canClaim
            ? "✅ **Votre vote est disponible !** Cliquez sur le bouton pour voter, puis réclamez votre bonus !"
            : `⏳ **Vote en attente :** Prochain vote disponible <t:${nextVoteTimestamp}:R> (<t:${nextVoteTimestamp}:t>).`)
        )
        .setThumbnail(interaction.client.user?.displayAvatarURL?.() || null)
        .setFooter({ text: "Merci pour votre soutien envers Sparcky ! • sparcky.matteoriviere.fr" })
        .setTimestamp();

      const voteButton = new ButtonBuilder()
        .setLabel("Voter sur Top.gg")
        .setStyle(ButtonStyle.Link)
        .setURL(topggVoteUrl)
        .setEmoji("⭐");

      const claimButton = new ButtonBuilder()
        .setCustomId(`claim_vote_${interaction.user.id}`)
        .setLabel(canClaim ? "Réclamer ma récompense" : "Récompense déjà récupérée")
        .setStyle(canClaim ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(canClaim ? "🎁" : "⏳")
        .setDisabled(!canClaim);

      const inviteButton = new ButtonBuilder()
        .setLabel("Inviter Sparcky")
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl)
        .setEmoji("➕");

      const row = new ActionRowBuilder().addComponents(voteButton, claimButton, inviteButton);

      const response = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      if (!canClaim) return;

      // Collecteur pour le bouton interactif de récupération
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.customId === `claim_vote_${interaction.user.id}`,
        time: 120_000,
      });

      collector.on("collect", async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
          return btnInteraction.reply({
            content: "❌ Vous ne pouvez pas réclamer la récompense d'un autre membre.",
            ephemeral: true,
          });
        }

        await btnInteraction.deferUpdate();

        // Si Top.gg Token est configuré, vérifier en direct
        const hasVotedOnline = await checkTopGgVote(clientId, interaction.user.id);
        if (hasVotedOnline === false) {
          return btnInteraction.followUp({
            content: `⚠️ Nous n'avons pas encore détecté votre vote sur Top.gg ! Cliquez sur le lien pour voter : ${topggVoteUrl}`,
            ephemeral: true,
          });
        }

        // Re-vérifier en BDD pour éviter double claim
        user = await User.findOne(query);
        const checkNow = Date.now();
        if (user && user.lastVote && checkNow - new Date(user.lastVote).getTime() < VOTE_COOLDOWN_MS) {
          const nextTime = Math.floor((new Date(user.lastVote).getTime() + VOTE_COOLDOWN_MS) / 1000);
          return btnInteraction.followUp({
            content: `⏳ Vous avez déjà réclamé votre récompense récemment ! Prochain vote disponible <t:${nextTime}:R>.`,
            ephemeral: true,
          });
        }

        if (!user) {
          user = new User({
            ...query,
            lastVote: new Date(),
            balance: VOTE_REWARD_COINS,
          });
        } else {
          user.lastVote = new Date();
          user.balance = (user.balance || 0) + VOTE_REWARD_COINS;
        }
        await user.save();

        // Créditer l'XP de niveau
        let levelDoc = await Level.findOne(query);
        let leveledUp = false;
        let newLevel = 0;

        if (levelDoc) {
          levelDoc.xp += VOTE_REWARD_XP;
          while (levelDoc.xp >= calculateLevelXp(levelDoc.level)) {
            levelDoc.xp -= calculateLevelXp(levelDoc.level);
            levelDoc.level++;
            leveledUp = true;
            newLevel = levelDoc.level;
          }
          await levelDoc.save();
        } else {
          levelDoc = new Level({
            ...query,
            xp: VOTE_REWARD_XP,
            level: 0,
          });
          while (levelDoc.xp >= calculateLevelXp(levelDoc.level)) {
            levelDoc.xp -= calculateLevelXp(levelDoc.level);
            levelDoc.level++;
            leveledUp = true;
            newLevel = levelDoc.level;
          }
          await levelDoc.save();
        }

        const nextClaimTimestamp = Math.floor((Date.now() + VOTE_COOLDOWN_MS) / 1000);

        const successEmbed = new EmbedBuilder()
          .setColor(COLORS?.SUCCESS || 0x10b981)
          .setTitle("🎉 Récompense de vote récupérée !")
          .setDescription(
            `Merci infiniment pour votre soutien envers **Sparcky** sur Top.gg !\n\n` +
            `💰 **+${VOTE_REWARD_COINS} ${currencySymbol}** ajoutés à votre portefeuille (Nouveau solde : **${user.balance} ${currencySymbol}**)\n` +
            `⭐ **+${VOTE_REWARD_XP} XP** de progression de niveau` +
            (leveledUp ? `\n🎊 **LEVEL UP !** Vous passez au niveau **${newLevel}** !` : "") +
            `\n\n⏳ Vous pourrez revoter et réclamer à nouveau <t:${nextClaimTimestamp}:R> (<t:${nextClaimTimestamp}:t>).`
          )
          .setThumbnail(interaction.client.user?.displayAvatarURL?.() || null)
          .setFooter({ text: "Sparcky • Vote Top.gg" })
          .setTimestamp();

        const disabledClaimButton = new ButtonBuilder()
          .setCustomId(`claim_vote_${interaction.user.id}`)
          .setLabel("Récompense déjà récupérée")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⏳")
          .setDisabled(true);

        const updatedRow = new ActionRowBuilder().addComponents(
          voteButton,
          disabledClaimButton,
          inviteButton
        );

        await interaction.editReply({
          embeds: [successEmbed],
          components: [updatedRow],
        }).catch(() => {});

        collector.stop("CLAIMED");
      });

      collector.on("end", async (_, reason) => {
        if (reason !== "CLAIMED") {
          const timeoutRow = new ActionRowBuilder().addComponents(
            voteButton,
            new ButtonBuilder()
              .setCustomId("expired_vote")
              .setLabel("Bouton expiré (relancez /vote)")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            inviteButton
          );
          await interaction.editReply({ components: [timeoutRow] }).catch(() => {});
        }
      });
    } catch (error) {
      logger.error(`Erreur avec la commande /vote : ${error}`);
      const errorMsg = (await interaction.t?.("ERRORS.COMMAND_FAILED")) || "Une erreur est survenue lors de l'exécution de cette commande.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMsg, embeds: [] }).catch(() => {});
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
      }
    }
  },
};
