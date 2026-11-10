const {
  PermissionFlagsBits,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");

const Warn = require("../../models/Warn");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unwarn")
    .setDescription("Enlever un ou plusieurs warns à un membre du serveur")
    .setDescriptionLocalizations({
      "en-US": "Remove one or more warnings from a server member",
    })
    .addMentionableOption((option) =>
      option
        .setName("membre")
        .setDescription("Membre à unwarn")
        .setDescriptionLocalizations({
          "en-US": "Member to unwarn",
        })
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de warns à retirer")
        .setDescriptionLocalizations({
          "en-US": "Number of warnings to remove",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison de l’unwarn")
        .setDescriptionLocalizations({
          "en-US": "Reason for the unwarn",
        })
        .setRequired(false),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.KickMembers)),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const membreId = interaction.options.get("membre").value;
    const nbUnwarn = interaction.options.get("nombre").value;
    const raison =
      interaction.options.get("raison")?.value ||
      (await interaction.t("COMMON.DEFAULT_REASON"));

    await interaction.deferReply();

    const member = await interaction.guild.members
      .fetch(membreId)
      .catch(() => null);
    if (!member)
      return interaction.editReply(await interaction.t("ERRORS.MEMBER_NOT_IN_GUILD"));

    const warn = await Warn.findOne({
      userId: member.id,
      guildId: interaction.guild.id,
    });
    if (!warn) {
      return interaction.editReply(
        await interaction.t("MODERATION.UNWARN.NEVER_WARNED", { member: `${member}` }),
      );
    }

    if (warn.warn <= 0) {
      return interaction.editReply(
        await interaction.t("MODERATION.UNWARN.NO_WARNS_LEFT", { member: `${member}` }),
      );
    }

    const oldWarns = warn.warn;

    if (nbUnwarn >= warn.warn) {
      warn.warn = 0;
    } else {
      warn.warn -= nbUnwarn;
    }

    warn.raison.push(`Unwarn: ${raison}`);
    await warn.save();

    const embed = new EmbedBuilder()
      .setColor("#00ff99")
      .setTitle(await interaction.t("MODERATION.UNWARN.TITLE"))
      .setDescription(
        await interaction.t("MODERATION.UNWARN.DESCRIPTION", { member: `${member}` }),
      )
      .addFields(
        { name: await interaction.t("COMMON.REASON"), value: raison, inline: false },
        { name: await interaction.t("MODERATION.UNWARN.FIELDS.REMOVED"), value: `${nbUnwarn}`, inline: true },
        { name: await interaction.t("MODERATION.UNWARN.FIELDS.REMAINING"), value: `${warn.warn}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    await member
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor("#00ff99")
            .setTitle(
              await interaction.t("MODERATION.UNWARN.DM.TITLE", {
                guild: interaction.guild.name,
              }),
            )
            .addFields(
              { name: await interaction.t("COMMON.REASON"), value: raison },
              { name: await interaction.t("MODERATION.UNWARN.FIELDS.REMOVED"), value: `${nbUnwarn}` },
              { name: await interaction.t("MODERATION.UNWARN.FIELDS.REMAINING"), value: `${warn.warn}` },
            )
            .setTimestamp(),
        ],
      })
      .catch(() => {});

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
            .setColor("#00ff99")
            .setTitle(await interaction.t("MODERATION.UNWARN.LOG.TITLE"))
            .setDescription(
              await interaction.t("MODERATION.UNWARN.LOG.DESCRIPTION", {
                member: `${member}`,
                moderator: `${interaction.user}`,
              }),
            )
            .addFields(
              { name: await interaction.t("COMMON.REASON"), value: raison },
              { name: await interaction.t("MODERATION.UNWARN.FIELDS.REMOVED"), value: `${nbUnwarn}` },
              { name: await interaction.t("MODERATION.UNWARN.FIELDS.BEFORE"), value: `${oldWarns}`, inline: true },
              { name: await interaction.t("MODERATION.UNWARN.FIELDS.REMAINING"), value: `${warn.warn}`, inline: true },
            )
            .setTimestamp(),
        ],
      });
    }
  },
};
