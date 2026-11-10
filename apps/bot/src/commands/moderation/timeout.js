const {
  PermissionFlagsBits,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const logger = require("../../utils/logger");
const ms = require("ms");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  /**
   *
   * @param {import("discord.js").Client} client
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */

  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout un membre")
    .setDescriptionLocalizations({
      "en-US": "Timeout a member",
    })
    .addMentionableOption((option) =>
      option
        .setName("membre")
        .setDescription("Le membre que vous voulez timeout.")
        .setDescriptionLocalizations({
          "en-US": "The member you want to timeout",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("durée")
        .setDescription("durée du timeout (30m, 1h, 1 jour).")
        .setDescriptionLocalizations({
          "en-US": "Timeout duration (30m, 1h, 1 day)",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison du timeout")
        .setDescriptionLocalizations({
          "en-US": "Reason for the timeout",
        })
        .setRequired(false),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.MuteMembers)),
  async execute(interaction) {
    const mentionable = interaction.options.get("membre").value;
    const durationRaw = interaction.options.get("durée").value;
    const raison =
      interaction.options.get("raison")?.value ||
      (await interaction.t("COMMON.DEFAULT_REASON"));

    await interaction.deferReply();

    const membre = await interaction.guild.members.fetch(mentionable).catch(() => null);
    if (!membre) {
      await interaction.editReply(await interaction.t("ERRORS.MEMBER_NOT_IN_GUILD"));
      return;
    }

    if (membre.user.bot) {
      await interaction.editReply(await interaction.t("ERRORS.CANNOT_TIMEOUT_BOT"));
      return;
    }

    const durationMs = ms(durationRaw);
    if (isNaN(durationMs)) {
      await interaction.editReply(await interaction.t("ERRORS.INVALID_DURATION"));
      return;
    }

    if (durationMs < 5000 || durationMs > 2.419e9) {
      await interaction.editReply(await interaction.t("ERRORS.DURATION_OUT_OF_RANGE"));
      return;
    }

    const membreRolePosition = membre.roles.highest.position;
    const requestUserRolePosition = interaction.member.roles.highest.position;
    const botRolePosition = interaction.guild.members.me.roles.highest.position;

    if (membreRolePosition >= requestUserRolePosition) {
      await interaction.editReply(
        await interaction.t("ERRORS.ROLE_TOO_HIGH_TARGET", { action: "timeout" }),
      );
      return;
    }

    if (membreRolePosition >= botRolePosition) {
      await interaction.editReply(
        await interaction.t("ERRORS.ROLE_TOO_HIGH_BOT", { action: "timeout" }),
      );
      return;
    }

    try {
      const { default: prettyMs } = await import("pretty-ms");
      const pretty = prettyMs(durationMs, { verbose: true });

      if (membre.isCommunicationDisabled()) {
        await membre.timeout(durationMs, raison);
        await interaction.editReply(
          await interaction.t("MODERATION.TIMEOUT.UPDATED", {
            member: `${membre}`,
            duration: pretty,
            reason: raison,
          }),
        );
        return;
      }

      await membre.timeout(durationMs, raison);
      await interaction.editReply(
        await interaction.t("MODERATION.TIMEOUT.SUCCESS", {
          member: `${membre}`,
          duration: pretty,
          reason: raison,
        }),
      );

      await membre
        .send(
          await interaction.t("MODERATION.TIMEOUT.DM", {
            guild: interaction.guild.name,
            moderator: interaction.user.tag,
            duration: pretty,
            reason: raison,
          }),
        )
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
              .setTitle(await interaction.t("MODERATION.TIMEOUT.LOG.TITLE"))
              .setDescription(
                await interaction.t("MODERATION.TIMEOUT.LOG.DESCRIPTION", {
                  member: `${membre}`,
                  moderator: `${interaction.user}`,
                }),
              )
              .addFields(
                { name: await interaction.t("COMMON.REASON"), value: raison },
                { name: await interaction.t("COMMON.DURATION"), value: pretty },
              )
              .setTimestamp(),
          ],
        });
      }
    } catch (error) {
      logger.error(`Il y a eu une erreur dans le timeout d'un membre ${error}`);
      await interaction.editReply(await interaction.t("ERRORS.COMMAND_FAILED"));
    }
  },
};
