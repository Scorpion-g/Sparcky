const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Payer un utilisateur")
    .setDescriptionLocalizations({
      "en-US": "Pay a user",
    })
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("Utilisateur à qui vous voulez payer")
        .setDescriptionLocalizations({
          "en-US": "User you want to pay",
        })
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("montant")
        .setDescription("Montant à payer")
        .setDescriptionLocalizations({
          "en-US": "Amount to pay",
        })
        .setRequired(true),
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("utilisateur");
    const amount = interaction.options.getInteger("montant");

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: await interaction.t("ECONOMY.PAY.SELF"),
        ephemeral: true,
      });
    }

    if (amount <= 0) {
      return interaction.reply({
        content: await interaction.t("ECONOMY.PAY.INVALID_AMOUNT"),
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let payer = await User.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      });
      if (!payer) {
        payer = new User({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          balance: 0,
        });
      }

      if (payer.balance < amount) {
        return interaction.editReply({
          content: await interaction.t("ECONOMY.PAY.INSUFFICIENT"),
          ephemeral: true,
        });
      }

      let payee = await User.findOne({
        userId: targetUser.id,
        guildId: interaction.guild.id,
      });
      if (!payee) {
        payee = new User({
          userId: targetUser.id,
          guildId: interaction.guild.id,
          balance: 0,
        });
      }

      payer.balance -= amount;
      payee.balance += amount;

      await payer.save();
      await payee.save();

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("ECONOMY.PAY.EMBED.TITLE"))
        .setDescription(await interaction.t("ECONOMY.PAY.EMBED.DESCRIPTION"))
        .addFields(
          {
            name: await interaction.t("ECONOMY.PAY.EMBED.FIELDS.PAYER"),
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: await interaction.t("ECONOMY.PAY.EMBED.FIELDS.PAYEE"),
            value: `<@${targetUser.id}>`,
            inline: true,
          },
          {
            name: await interaction.t("ECONOMY.PAY.EMBED.FIELDS.AMOUNT"),
            value: `${amount}`,
            inline: true,
          },
        )
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error(`Erreur lors du paiement: ${error}`);
      await interaction.editReply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
