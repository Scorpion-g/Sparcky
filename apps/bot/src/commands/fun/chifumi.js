const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const User = require("../../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chifumi")
    .setDescription("Jouer au chifumi contre le bot")
    .setDescriptionLocalizations({
      "en-US": "Play rock-paper-scissors",
    })
    .addStringOption((option) =>
      option
        .setName("choix")
        .setDescription("Choisissez pierre, feuille ou ciseaux")
        .setDescriptionLocalizations({
          "en-US": "Choose rock, paper or scissors",
        })
        .setRequired(true)
        .addChoices(
          {
            name: "pierre",
            name_localizations: { "en-US": "rock" },
            value: "pierre",
          },
          {
            name: "feuille",
            name_localizations: { "en-US": "paper" },
            value: "feuille",
          },
          {
            name: "ciseaux",
            name_localizations: { "en-US": "scissors" },
            value: "ciseaux",
          },
        ),
    )
    .addMentionableOption((option) =>
      option
        .setName("opponent")
        .setDescription("Mentionnez un utilisateur pour jouer contre lui (optionnel)")
        .setDescriptionLocalizations({
          "en-US": "Mention a user to play against them (optional)",
        })
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("mise")
        .setDescription("Misez un montant (optionnel)")
        .setDescriptionLocalizations({
          "en-US": "Bet an amount (optional)",
        })
        .setRequired(false)
        .setMinValue(1),
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userChoice = interaction.options.getString("choix");
    const choices = ["pierre", "feuille", "ciseaux"];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const opponent = interaction.options.getMentionable("opponent");
    const betAmount = interaction.options.getInteger("mise") || 0;

    // Gestion de la mise
    if (betAmount > 0) {
      let userData = await User.findOne({
        guildId,
        userId: interaction.user.id,
      });

      if (!userData) {
        userData = new User({
          guildId,
          userId: interaction.user.id,
          balance: 100,
        });
      }

      if (userData.balance < betAmount) {
        return interaction.reply({
          content: await interaction.t("FUN.CHIFUMI.ERRORS.INSUFFICIENT_FUNDS"),
          ephemeral: true,
        });
      }

      userData.balance -= betAmount;
      await userData.save();
    }

    // Jeu contre un autre utilisateur
    if (opponent && opponent.id === interaction.user.id) {
      const userData = await User.findOne({ guildId, userId: interaction.user.id });
      if (betAmount > 0 && userData) {
        userData.balance += betAmount;
        await userData.save();
      }
      return interaction.reply({
        content: await interaction.t("FUN.CHIFUMI.ERRORS.SELF_OPPONENT"),
        ephemeral: true,
      });
    }

    if (opponent && opponent.user?.bot && opponent.id !== interaction.client.user.id) {
      const userData = await User.findOne({ guildId, userId: interaction.user.id });
      if (betAmount > 0 && userData) {
        userData.balance += betAmount;
        await userData.save();
      }
      return interaction.reply({
        content: await interaction.t("FUN.CHIFUMI.ERRORS.OTHER_BOT_OPPONENT"),
        ephemeral: true,
      });
    }

    if (opponent && opponent.id !== interaction.client.user.id) {
      const filter = (m) => m.author.id === opponent.id;

      await interaction.reply({
        content: await interaction.t("FUN.CHIFUMI.PVP.ASK", {
          opponent: `${opponent}`,
          betAmount,
        }),
      });

      try {
        const collected = await interaction.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
          errors: ["time"],
        });

        const opponentChoice = collected.first().content.toLowerCase();
        if (!choices.includes(opponentChoice)) {
          return interaction.followUp({
            content: await interaction.t("FUN.CHIFUMI.PVP.INVALID_CHOICE"),
          });
        }

        let result;

        if (userChoice === opponentChoice) {
          result = await interaction.t("FUN.CHIFUMI.RESULTS.DRAW");

          const userData = await User.findOne({ guildId, userId: interaction.user.id });
          if (betAmount > 0 && userData) {
            userData.balance += betAmount;
            await userData.save();
          }

          const opponentData = await User.findOne({ guildId, userId: opponent.id });
          if (betAmount > 0 && opponentData) {
            opponentData.balance += betAmount;
            await opponentData.save();
          }

          const embed = new EmbedBuilder().setDescription(
            await interaction.t("FUN.CHIFUMI.PVP.DRAW_REFUND", {
              user: interaction.user.username,
              opponent: opponent.user.username,
              betAmount,
            }),
          );
          await interaction.followUp({ embeds: [embed] });
        } else if (
          (userChoice === "pierre" && opponentChoice === "ciseaux") ||
          (userChoice === "feuille" && opponentChoice === "pierre") ||
          (userChoice === "ciseaux" && opponentChoice === "feuille")
        ) {
          result = await interaction.t("FUN.CHIFUMI.PVP.USER_WINS", {
            user: interaction.user.username,
          });

          const userData = await User.findOne({ guildId, userId: interaction.user.id });
          if (betAmount > 0 && userData) {
            userData.balance += betAmount * 2;
            await userData.save();
          }

          const opponentData = await User.findOne({ guildId, userId: opponent.id });
          if (betAmount > 0 && opponentData) {
            opponentData.balance -= betAmount;
            await opponentData.save();
          }

          const embed = new EmbedBuilder().setDescription(
            await interaction.t("FUN.CHIFUMI.PVP.WIN_REWARD", {
              winner: interaction.user.username,
              loser: opponent.user.username,
              amount: betAmount * 2,
            }),
          );
          await interaction.followUp({ embeds: [embed] });
        } else {
          result = await interaction.t("FUN.CHIFUMI.PVP.USER_WINS", {
            user: opponent.user.username,
          });

          let opponentData = await User.findOne({ guildId, userId: opponent.id });
          if (betAmount > 0 && opponentData) {
            opponentData.balance += betAmount * 2;
            await opponentData.save();
          }

          const userData = await User.findOne({ guildId, userId: interaction.user.id });
          if (betAmount > 0 && userData) {
            userData.balance -= betAmount;
            await userData.save();
          }

          const embed = new EmbedBuilder().setDescription(
            await interaction.t("FUN.CHIFUMI.PVP.WIN_REWARD", {
              winner: opponent.user.username,
              loser: interaction.user.username,
              amount: betAmount * 2,
            }),
          );
          await interaction.followUp({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle(await interaction.t("FUN.CHIFUMI.TITLE"))
          .addFields(
            {
              name: await interaction.t("FUN.CHIFUMI.PVP.USER_CHOICE", {
                user: interaction.user.username,
              }),
              value: userChoice,
              inline: true,
            },
            {
              name: await interaction.t("FUN.CHIFUMI.PVP.USER_CHOICE", {
                user: opponent.user.username,
              }),
              value: opponentChoice,
              inline: true,
            },
            {
              name: await interaction.t("FUN.CHIFUMI.RESULT_LABEL"),
              value: result,
              inline: false,
            },
          )
          .setTimestamp();

        return interaction.followUp({ embeds: [embed] });
      } catch (e) {
        logger.error(e);
        return interaction.followUp({
          content: await interaction.t("FUN.CHIFUMI.PVP.TIMEOUT"),
        });
      }
    }

    // Jeu contre le bot
    let result;
    if (userChoice === botChoice) {
      result = await interaction.t("FUN.CHIFUMI.RESULTS.DRAW");
    } else if (
      (userChoice === "pierre" && botChoice === "ciseaux") ||
      (userChoice === "feuille" && botChoice === "pierre") ||
      (userChoice === "ciseaux" && botChoice === "feuille")
    ) {
      result = await interaction.t("FUN.CHIFUMI.RESULTS.YOU_WIN");
    } else {
      result = await interaction.t("FUN.CHIFUMI.RESULTS.BOT_WINS");
    }

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(await interaction.t("FUN.CHIFUMI.TITLE"))
      .addFields(
        {
          name: await interaction.t("FUN.CHIFUMI.BOT.USER_CHOICE"),
          value: userChoice,
          inline: true,
        },
        {
          name: await interaction.t("FUN.CHIFUMI.BOT.BOT_CHOICE"),
          value: botChoice,
          inline: true,
        },
        {
          name: await interaction.t("FUN.CHIFUMI.RESULT_LABEL"),
          value: result,
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
