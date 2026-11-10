const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const logger = require("../../utils/logger");

const dailyAmount = 500;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Récupérer votre récompense journalière de 500 $.")
    .setDescriptionLocalizations({
      "en-US": "Claim your daily reward of $500.",
    }),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: await interaction.t("ERRORS.GUILD_ONLY"),
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply();

      const query = {
        userId: interaction.member.id,
        guildId: interaction.guild.id,
      };

      let user = await User.findOne(query);

      if (user) {
        const lastDailyDate = user.lastDaily.toDateString();
        const currentDate = new Date().toDateString();

        if (lastDailyDate === currentDate) {
          await interaction.editReply(
            await interaction.t("ECONOMY.DAILY.ALREADY_CLAIMED"),
          );
          return;
        }

        user.lastDaily = new Date();
      } else {
        user = new User({
          ...query,
          lastDaily: new Date(),
        });
      }

      user.balance += dailyAmount;
      await user.save();

      await interaction.editReply(
        await interaction.t("ECONOMY.DAILY.CLAIMED", {
          amount: dailyAmount,
          balance: user.balance,
        }),
      );
    } catch (error) {
      logger.error(`Il y a une erreur avec /daily : ${error}`);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          await interaction.t("ERRORS.COMMAND_FAILED"),
        );
      } else {
        await interaction.reply({
          content: await interaction.t("ERRORS.COMMAND_FAILED"),
          ephemeral: true,
        });
      }
    }
  },
};
