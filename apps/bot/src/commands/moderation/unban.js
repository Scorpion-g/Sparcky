const {
  PermissionFlagsBits,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const logger = require("../../utils/logger");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Débannir un membre du serveur")
    .setDescriptionLocalizations({
      fr: "Débannir un membre du serveur",
      "en-US": "Unban a server member",
    })
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("L'ID du membre à débannir")
        .setDescriptionLocalizations({
          fr: "L'ID du membre à débannir",
          "en-US": "ID of the member to unban",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison du débannissement")
        .setDescriptionLocalizations({
          fr: "La raison du débannissement",
          "en-US": "Reason for unbanning",
        })
        .setRequired(false),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.BanMembers)),

  /**
   *
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const raison =
      interaction.options.get("raison")?.value ||
      (await interaction.t("COMMON.DEFAULT_REASON"));
    const memberId = interaction.options.get("id").value;

    await interaction.deferReply();

    try {
      const bans = await interaction.guild.bans.fetch();
      const banInfo = bans.get(memberId);

      if (!banInfo) {
        return interaction.editReply(
          await interaction.t("MODERATION.UNBAN.NOT_BANNED", { memberId }),
        );
      }

      await interaction.guild.members.unban(memberId, raison);

      const embed = new EmbedBuilder()
        .setColor("#00ff99")
        .setTitle(await interaction.t("MODERATION.UNBAN.TITLE"))
        .setDescription(
          await interaction.t("MODERATION.UNBAN.DESCRIPTION", {
            tag: banInfo.user.tag,
          }),
        )
        .addFields(
          { name: await interaction.t("MODERATION.UNBAN.FIELDS.ID"), value: memberId, inline: true },
          { name: await interaction.t("COMMON.REASON"), value: raison, inline: true },
          { name: await interaction.t("MODERATION.UNBAN.FIELDS.MODERATOR"), value: interaction.user.tag, inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      await banInfo.user
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor("#00ff99")
              .setTitle(await interaction.t("MODERATION.UNBAN.DM.TITLE"))
              .setDescription(
                await interaction.t("MODERATION.UNBAN.DM.DESCRIPTION", {
                  guild: interaction.guild.name,
                }),
              )
              .addFields({ name: await interaction.t("COMMON.REASON"), value: raison })
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
              .setTitle(await interaction.t("MODERATION.UNBAN.LOG.TITLE"))
              .setDescription(
                await interaction.t("MODERATION.UNBAN.LOG.DESCRIPTION", {
                  tag: banInfo.user.tag,
                }),
              )
              .addFields(
                { name: await interaction.t("MODERATION.UNBAN.FIELDS.ID"), value: memberId, inline: true },
                { name: await interaction.t("COMMON.REASON"), value: raison, inline: true },
                { name: await interaction.t("MODERATION.UNBAN.FIELDS.MODERATOR"), value: interaction.user.tag, inline: true },
              )
              .setTimestamp(),
          ],
        });
      }
    } catch (error) {
      logger.error(`Erreur lors du débannissement:`, error);
      await interaction.editReply(await interaction.t("ERRORS.COMMAND_FAILED"));
    }
  },
};
