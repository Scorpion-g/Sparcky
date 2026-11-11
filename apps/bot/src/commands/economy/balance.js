const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");
const { COLORS } = require("../../utils/theme");

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
      const guildOnlyMsg = (await interaction.t?.("ERRORS.GUILD_ONLY")) || "Cette commande doit être exécutée sur un serveur.";
      await interaction.reply({
        content: guildOnlyMsg,
        ephemeral: true,
      });
      return;
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

      const targetUser = interaction.options.getUser("user") || interaction.user;
      const targetUserId = targetUser.id;
      const isSelf = targetUserId === interaction.user.id;

      const currencySymbol = guildConfig?.currencySymbol || "$";
      const currencyName = guildConfig?.currencyName || "Coins";

      const user = await User.findOne({
        userId: targetUserId,
        guildId: interaction.guild.id,
      });

      const balance = user ? (user.balance || 0) : 0;
      const targetMember = interaction.options.getMember("user")
        || (isSelf ? interaction.member : null)
        || await interaction.guild.members.fetch(targetUserId).catch(() => null);

      const displayName = targetMember?.displayName || targetUser.displayName || targetUser.username;
      const avatarURL = targetMember?.displayAvatarURL?.() || targetUser.displayAvatarURL();

      const authorObj = { name: displayName };
      if (avatarURL) {
        authorObj.iconURL = avatarURL;
      }

      const description = isSelf
        ? `Vous possédez actuellement **${balance} ${currencySymbol}**.`
        : `<@${targetUserId}> possède actuellement **${balance} ${currencySymbol}**.`;

      const embed = new EmbedBuilder()
        .setColor(COLORS?.PRIMARY || "#6366F1")
        .setAuthor(authorObj)
        .setTitle(`💰 Solde ${currencyName}`)
        .setDescription(description)
        .addFields(
          { name: "Articles possédés", value: `${user?.items?.length || 0} article(s)`, inline: true }
        )
        .setFooter({ text: "💡 Astuce : Utilisez /vote toutes les 12h pour gagner 1 000 pièces et 500 XP !" })
        .setTimestamp();

      const clientId =
        interaction.client?.user?.id ||
        process.env.CLIENT_ID ||
        "1275197373580050604";
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Gagner des pièces (/vote)")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://top.gg/bot/${clientId}/vote`)
          .setEmoji("⭐")
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      logger.error(`Erreur commande /money: ${error.stack || error}`);
      const errorMsg = (await interaction.t?.("ERRORS.COMMAND_FAILED")) || "Une erreur est survenue lors de l'exécution de cette commande.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMsg, embeds: [] }).catch(() => {});
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
      }
    }
  },
};
