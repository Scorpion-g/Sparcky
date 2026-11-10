const {
  PermissionFlagsBits,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const logger = require("../../utils/logger");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { addWarn } = require("../../utils/warnUtils");
const { checkAndSanction } = require("../../utils/autoSanction");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Pour warn un membre du serveur")
    .setDescriptionLocalizations({
      "en-US": "Warn a server member",
    })
    .addMentionableOption((option) =>
      option
        .setName("membre")
        .setDescription("Membre à avertir")
        .setDescriptionLocalizations({
          "en-US": "Member to warn",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison de l’avertissement du membre")
        .setDescriptionLocalizations({
          "en-US": "Reason for the warning",
        })
        .setRequired(false),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.KickMembers)),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const membreId = interaction.options.get("membre").value;
    const raison =
      interaction.options.get("raison")?.value ||
      (await interaction.t("COMMON.DEFAULT_REASON"));

    await interaction.deferReply({ ephemeral: true });

    const member = await interaction.guild.members
      .fetch(membreId)
      .catch(() => null);
    if (!member)
      return interaction.editReply(await interaction.t("ERRORS.MEMBER_NOT_IN_GUILD"));

    // Protections
    if (member.id === interaction.guild.ownerId)
      return interaction.editReply(await interaction.t("ERRORS.CANNOT_SANCTION_OWNER"));
    if (
      member.roles.highest.position >= interaction.member.roles.highest.position
    )
      return interaction.editReply(
        await interaction.t("ERRORS.ROLE_TOO_HIGH_TARGET", { action: "warn" }),
      );
    if (
      member.roles.highest.position >=
      interaction.guild.members.me.roles.highest.position
    )
      return interaction.editReply(
        await interaction.t("ERRORS.ROLE_TOO_HIGH_BOT", { action: "warn" }),
      );

    const warnCount = await addWarn(member, raison);
    const Warn = require("../../models/Warn");
    const warnDoc = new Warn({
      userId: member.id,
      guildId: interaction.guild.id,
      moderatorId: interaction.user.id,
      reason: raison,
      date: new Date(),
      warn: warnCount,
    });
    await warnDoc.save();

    try {
      await checkAndSanction(member, warnDoc.warn);
    } catch (error) {
      logger.error(
        "Erreur lors de la vérification des sanctions automatiques :",
        error,
      );
    }

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(await interaction.t("MODERATION.WARN.TITLE"))
      .setDescription(
        await interaction.t("MODERATION.WARN.DESCRIPTION", { member: `${member}` }),
      )
      .addFields(
        { name: await interaction.t("COMMON.REASON"), value: raison, inline: false },
        { name: await interaction.t("MODERATION.WARN.FIELDS.TOTAL"), value: `${warnCount}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    await member
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle(
              await interaction.t("MODERATION.WARN.DM.TITLE", {
                guild: interaction.guild.name,
              }),
            )
            .addFields(
              { name: await interaction.t("COMMON.REASON"), value: raison },
              { name: await interaction.t("MODERATION.WARN.FIELDS.TOTAL"), value: `${warnCount}` },
            )
            .setTimestamp(),
        ],
      })
      .catch(() => {});

    try {
      const guildConfig = await GuildConfiguration.findOne({
        guildId: interaction.guild.id,
      });
      const logChannel = interaction.guild.channels.cache.get(
        guildConfig?.modLogChannel,
      );

      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("#FFA500")
              .setTitle(await interaction.t("MODERATION.WARN.LOG.TITLE"))
              .setDescription(
                await interaction.t("MODERATION.WARN.LOG.DESCRIPTION", {
                  member: `${member}`,
                  moderator: `${interaction.user}`,
                }),
              )
              .addFields(
                { name: await interaction.t("COMMON.REASON"), value: raison },
                { name: await interaction.t("MODERATION.WARN.FIELDS.TOTAL"), value: `${warnCount}` },
              )
              .setTimestamp(),
          ],
        });
      }
    } catch (error) {
      logger.error("Erreur lors du log du warn:", error);
    }
  },
};
