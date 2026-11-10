const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
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

      const guildConfig = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
      const dailyAmount = guildConfig?.dailyAmount ?? 500;
      const currencySymbol = guildConfig?.currencySymbol || "$";

      const query = {
        userId: interaction.member.id,
        guildId: interaction.guild.id,
      };

      let user = await User.findOne(query);

      if (user && user.lastDaily) {
        const lastDailyDate = new Date(user.lastDaily).toDateString();
        const currentDate = new Date().toDateString();

        if (lastDailyDate === currentDate) {
          await interaction.editReply(
            `⏳ Vous avez déjà récupéré votre récompense aujourd'hui ! Revenez demain.`
          );
          return;
        }

        user.lastDaily = new Date();
      } else if (user) {
        user.lastDaily = new Date();
      } else {
        user = new User({
          ...query,
          lastDaily: new Date(),
        });
      }

      user.balance = (user.balance || 0) + dailyAmount;
      await user.save();

      await interaction.editReply(
        `🎉 Vous avez reçu votre récompense quotidienne de **${dailyAmount} ${currencySymbol}** !\n💰 Nouveau solde : **${user.balance} ${currencySymbol}**.`
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
