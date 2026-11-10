const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const logger = require("../../utils/logger");

const GuildConfiguration = require("../../models/GuildConfiguration");
module.exports = {
  /**
   *
   * @param {import("discord.js").Client} client
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   *
   */
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Pour bannir un membre du serveur")
    .setDescriptionLocalizations({
      "en-US": "Ban a server member",
    })
    .addMentionableOption((option) =>
      option
        .setName("membre")
        .setDescription("Bannir un membre")
        .setDescriptionLocalizations({
          "en-US": "Member to ban",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison du bannissement du membre")
        .setDescriptionLocalizations({
          "en-US": "Reason for banning the member",
        })
        .setRequired(false),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.BanMembers)),
  async execute(interaction) {
    const membreId = interaction.options.get("membre").value;
    const raison =
      interaction.options.get("raison")?.value ||
      (await interaction.t("COMMON.DEFAULT_REASON"));

    await interaction.deferReply();

    const member = await interaction.guild.members.fetch(membreId).catch(() => null);

    if (!member) {
      await interaction.editReply(await interaction.t("ERRORS.MEMBER_NOT_IN_GUILD"));
      return;
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.editReply(await interaction.t("ERRORS.CANNOT_SANCTION_OWNER"));
      return;
    }

    const memberRolePosition = member.roles.highest.position;
    const requestUserRolePosition = interaction.member.roles.highest.position;
    const botRolePosition = interaction.guild.members.me.roles.highest.position;

    if (memberRolePosition >= requestUserRolePosition) {
      await interaction.editReply(
        await interaction.t("ERRORS.ROLE_TOO_HIGH_TARGET", { action: "ban" }),
      );
      return;
    }
    if (memberRolePosition >= botRolePosition) {
      await interaction.editReply(
        await interaction.t("ERRORS.ROLE_TOO_HIGH_BOT", { action: "ban" }),
      );
      return;
    }
    try {
      await member.ban({ raison });
      await interaction.editReply(
        await interaction.t("MODERATION.BAN.SUCCESS", {
          member: `${member}`,
          reason: raison,
        }),
      );
      await member
        .send(
          await interaction.t("MODERATION.BAN.DM", {
            guild: interaction.guild.name,
            moderator: interaction.user.tag,
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
              .setTitle(await interaction.t("MODERATION.BAN.LOG.TITLE"))
              .setDescription(
                await interaction.t("MODERATION.BAN.LOG.DESCRIPTION", {
                  member: `${member}`,
                  moderator: `${interaction.user}`,
                }),
              )
              .addFields({
                name: await interaction.t("COMMON.REASON"),
                value: raison,
              })
              .setTimestamp(),
          ],
        });
      }
    } catch (error) {
      logger.error(`Il y a une erreur lors du bannissement: ${error}`);
      await interaction.editReply(await interaction.t("ERRORS.COMMAND_FAILED"));
    }
  },
};
