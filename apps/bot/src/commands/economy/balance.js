const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("money")
    .setDescription("Voir votre argent ou celui d'un membre.")
    .setDescriptionLocalizations({
      "en-US": "View your money or another member's money.",
    })
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Le membre dont vous voulez voir l'argent.")
        .setDescriptionLocalizations({
          "en-US": "The member whose money you want to view.",
        })
        .setRequired(false),
    ),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: await interaction.t("ERRORS.GUILD_ONLY"),
        ephemeral: true,
      });
      return;
    }

    const targetUserId =
      interaction.options.get("user")?.value || interaction.member.id;

    await interaction.deferReply();

    const user = await User.findOne({
      userId: targetUserId,
      guildId: interaction.guild.id,
    });

    if (!user) {
      await interaction.editReply(
        await interaction.t("ECONOMY.MONEY.NO_ACCOUNT", { userId: targetUserId }),
      );
      return;
    }

    await interaction.editReply(
      targetUserId === interaction.member.id
        ? await interaction.t("ECONOMY.MONEY.SELF", { balance: user.balance })
        : await interaction.t("ECONOMY.MONEY.OTHER", {
            userId: targetUserId,
            balance: user.balance,
          }),
    );
  },
};
