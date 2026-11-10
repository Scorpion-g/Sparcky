const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");

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

    const guildConfig = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
    const currencySymbol = guildConfig?.currencySymbol || "$";
    const currencyName = guildConfig?.currencyName || "Coins";

    const user = await User.findOne({
      userId: targetUserId,
      guildId: interaction.guild.id,
    });

    const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    const balance = user ? (user.balance || 0) : 0;

    const embed = new EmbedBuilder()
      .setColor("#6366F1")
      .setAuthor({
        name: targetMember?.user?.tag || `Utilisateur ${targetUserId}`,
        iconURL: targetMember?.user?.displayAvatarURL() || null
      })
      .setTitle(`💰 Solde ${currencyName}`)
      .setDescription(
        targetUserId === interaction.member.id
          ? `Vous possédez actuellement **${balance} ${currencySymbol}**.`
          : `<@${targetUserId}> possède actuellement **${balance} ${currencySymbol}**.`
      )
      .addFields(
        { name: "Articles possédés", value: `${user?.items?.length || 0} article(s)`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
