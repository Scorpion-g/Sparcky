const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { incrementQuestProgress } = require("../../utils/questUtils");
const logger = require("../../utils/logger");

// Set en mémoire des duels en cours pour éviter les doubles défis simultanés
const pendingDuels = new Set();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Défier un autre membre dans un duel avec mise d'argent.")
    .setDescriptionLocalizations({
      "en-US": "Challenge another member to a duel with a bet.",
    })
    .addUserOption((opt) =>
      opt
        .setName("adversaire")
        .setDescription("Le joueur que vous souhaitez défier")
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("mise")
        .setDescription("Montant de pièces mis en jeu par chaque joueur")
        .setMinValue(10)
        .setMaxValue(100000)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("jeu")
        .setDescription("Le mini-jeu du duel (par défaut : Lancer de Dés)")
        .addChoices(
          { name: "🎲 Lancer de Dés (1-6)", value: "dice" },
          { name: "✊ Chifumi Éclair (Pierre-Feuille-Ciseaux)", value: "chifumi" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande ne peut être exécutée que sur un serveur.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const challenger = interaction.user;
    const opponent = interaction.options.getUser("adversaire");
    const bet = interaction.options.getInteger("mise");
    const gameType = interaction.options.getString("jeu") || "dice";

    // 1. Validations de base
    if (opponent.id === challenger.id) {
      return interaction.reply({
        content: "❌ Vous ne pouvez pas vous défier vous-même !",
        ephemeral: true,
      });
    }

    if (opponent.bot) {
      return interaction.reply({
        content: "❌ Vous ne pouvez pas défier un bot !",
        ephemeral: true,
      });
    }

    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    if (guildConfig && guildConfig.economyEnabled === false) {
      return interaction.reply({
        content: "❌ L'économie est désactivée sur ce serveur.",
        ephemeral: true,
      });
    }

    const currencySymbol = guildConfig?.currencySymbol || "$";

    if (pendingDuels.has(challenger.id) || pendingDuels.has(opponent.id)) {
      return interaction.reply({
        content: "⏳ L'un des deux joueurs a déjà un duel en attente. Veuillez patienter.",
        ephemeral: true,
      });
    }

    // 2. Vérification des soldes
    const challengerDoc = await User.findOne({ userId: challenger.id, guildId });
    if (!challengerDoc || (challengerDoc.balance || 0) < bet) {
      return interaction.reply({
        content: `❌ Vous n'avez pas assez d'argent pour miser **${bet} ${currencySymbol}** ! (Solde: ${challengerDoc?.balance || 0} ${currencySymbol})`,
        ephemeral: true,
      });
    }

    const opponentDoc = await User.findOne({ userId: opponent.id, guildId });
    if (!opponentDoc || (opponentDoc.balance || 0) < bet) {
      return interaction.reply({
        content: `❌ **${opponent.username}** n'a pas assez d'argent pour accepter ce duel de **${bet} ${currencySymbol}** !`,
        ephemeral: true,
      });
    }

    pendingDuels.add(challenger.id);
    pendingDuels.add(opponent.id);

    // 3. Envoi de l'invitation avec boutons interactifs
    const acceptId = `duel_accept_${interaction.id}`;
    const refuseId = `duel_refuse_${interaction.id}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(acceptId)
        .setLabel(`Accepter (${bet} ${currencySymbol})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji("⚔️"),
      new ButtonBuilder()
        .setCustomId(refuseId)
        .setLabel("Décliner")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("✖️")
    );

    const gameName = gameType === "dice" ? "🎲 Lancer de Dés" : "✊ Chifumi Éclair";
    const inviteEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle(`⚔️ DÉFI EN DUEL : ${gameName}`)
      .setDescription(
        `**${challenger}** défie **${opponent}** en duel !\n\n` +
        `💰 **Mise :** \`${bet} ${currencySymbol}\` chacun\n` +
        `🏆 **Gain du vainqueur :** \`${Math.floor(bet * 2 * 0.95)} ${currencySymbol}\` *(taxe casino 5% incluse)*\n\n` +
        `👉 **${opponent}**, clique sur un bouton ci-dessous pour répondre au défi (60s).`
      )
      .setThumbnail(challenger.displayAvatarURL())
      .setTimestamp();

    const response = await interaction.reply({
      content: `${opponent}`,
      embeds: [inviteEmbed],
      components: [row],
    });

    // 4. Collector pour la réponse de l'adversaire
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.user.id !== opponent.id) {
        return btnInteraction.reply({
          content: "❌ Seul l'adversaire défié peut accepter ou refuser ce duel !",
          ephemeral: true,
        });
      }

      await btnInteraction.deferUpdate();
      collector.stop(btnInteraction.customId === acceptId ? "accepted" : "refused");
    });

    collector.on("end", async (_, reason) => {
      pendingDuels.delete(challenger.id);
      pendingDuels.delete(opponent.id);

      if (reason === "refused") {
        const refusedEmbed = new EmbedBuilder()
          .setColor(0x64748B)
          .setTitle("🏳️ Duel Décliné")
          .setDescription(`**${opponent.username}** a préféré décliner le duel de **${challenger.username}**. Aucun montant n'a été débité.`)
          .setTimestamp();

        return interaction.editReply({ embeds: [refusedEmbed], components: [] }).catch(() => {});
      }

      if (reason !== "accepted") {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(0x64748B)
          .setTitle("⏳ Duel Expiré")
          .setDescription(`**${opponent.username}** n'a pas répondu à temps au défi de **${challenger.username}**.`)
          .setTimestamp();

        return interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }

      // Le duel a été accepté ! On revérifie et déduit les soldes
      try {
        const freshChallenger = await User.findOne({ userId: challenger.id, guildId });
        const freshOpponent = await User.findOne({ userId: opponent.id, guildId });

        if (!freshChallenger || freshChallenger.balance < bet || !freshOpponent || freshOpponent.balance < bet) {
          return interaction.editReply({
            content: "❌ L'un des deux joueurs n'a plus les fonds nécessaires pour honorer le duel !",
            components: [],
          });
        }

        freshChallenger.balance -= bet;
        freshOpponent.balance -= bet;
        await freshChallenger.save();
        await freshOpponent.save();

        // Résolution du mini-jeu
        let winner = null;
        let loser = null;
        let detailsText = "";

        if (gameType === "dice") {
          let cRoll, oRoll;
          do {
            cRoll = Math.floor(Math.random() * 6) + 1;
            oRoll = Math.floor(Math.random() * 6) + 1;
          } while (cRoll === oRoll); // Pas d'égalité, on relance si égalité

          if (cRoll > oRoll) {
            winner = challenger;
            loser = opponent;
          } else {
            winner = opponent;
            loser = challenger;
          }

          detailsText =
            `🎲 **${challenger.username}** a fait un **${cRoll}** !\n` +
            `🎲 **${opponent.username}** a fait un **${oRoll}** !`;
        } else {
          // Chifumi
          const choices = ["Pierre 🪨", "Feuille 📄", "Ciseaux ✂️"];
          let cChoice, oChoice;
          do {
            cChoice = Math.floor(Math.random() * 3);
            oChoice = Math.floor(Math.random() * 3);
          } while (cChoice === oChoice);

          // 0 bat 2, 1 bat 0, 2 bat 1
          if ((cChoice === 0 && oChoice === 2) || (cChoice === 1 && oChoice === 0) || (cChoice === 2 && oChoice === 1)) {
            winner = challenger;
            loser = opponent;
          } else {
            winner = opponent;
            loser = challenger;
          }

          detailsText =
            `👉 **${challenger.username}** a joué **${choices[cChoice]}** !\n` +
            `👉 **${opponent.username}** a joué **${choices[oChoice]}** !`;
        }

        const payout = Math.floor(bet * 2 * 0.95);

        // Crédite le gagnant
        await User.findOneAndUpdate(
          { userId: winner.id, guildId },
          { $inc: { balance: payout } }
        );

        // Progression Quête Journalière ("duel") pour les deux participants
        incrementQuestProgress(challenger.id, guildId, "duel", 1).catch(() => {});
        incrementQuestProgress(opponent.id, guildId, "duel", 1).catch(() => {});

        const resultEmbed = new EmbedBuilder()
          .setColor(0x10B981)
          .setTitle("⚔️ RÉSULTAT DU DUEL !")
          .setDescription(
            `${detailsText}\n\n` +
            `👑 **Vainqueur :** ${winner} !\n` +
            `💰 **Pactole remporté :** **+${payout} ${currencySymbol}** ! 🪙\n` +
            `💀 **Perdant :** ${loser} (-${bet} ${currencySymbol})`
          )
          .setThumbnail(winner.displayAvatarURL())
          .setTimestamp();

        return interaction.editReply({
          content: null,
          embeds: [resultEmbed],
          components: [],
        });
      } catch (err) {
        logger.error(`[DUEL] Erreur exécution duel: ${err.message}`);
        return interaction.editReply({
          content: "❌ Une erreur est survenue lors de la résolution du duel.",
          components: [],
        });
      }
    });
  },
};
