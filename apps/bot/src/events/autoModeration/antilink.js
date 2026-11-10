const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { addWarn } = require("../../utils/warnUtils");
const logger = require("../../utils/logger");
const { t } = require("../../utils/t");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const guildConfig = await GuildConfiguration.findOne({
      guildId: message.guild.id,
    });

    if (!guildConfig || !guildConfig.antilink) return;

    const contentToCheck = message.content.replace(/[<>()]/g, "");
    const linkPatterns = [
      /https?:\/\/[^\s]+/gi,
      /www\.[^\s]+/gi,
      /discord\.gg\/[^\s]+/gi,
      /discordapp\.com\/invite\/[^\s]+/gi,
    ];

    const containsLink = linkPatterns.some((pattern) => pattern.test(contentToCheck));
    if (!containsLink) return;

    try {
      if (message.deletable) await message.delete();

      const reason = await t({ guildId: message.guild.id }, "AUTOMOD.ANTILINK.REASON");

      // Ajouter un warn à l'utilisateur
      const warnCount = await addWarn(message.member, reason);

      // DM à l'utilisateur
      await message.author
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setTitle(
                await t({ guildId: message.guild.id }, "AUTOMOD.DM.WARN_TITLE", {
                  guild: message.guild.name,
                }),
              )
              .addFields(
                { name: await t({ guildId: message.guild.id }, "COMMON.REASON"), value: reason },
                {
                  name: await t({ guildId: message.guild.id }, "AUTOMOD.DM.TOTAL_WARNS"),
                  value: `${warnCount}`,
                },
              )
              .setTimestamp(),
          ],
        })
        .catch(() => {});

      // Log
      const logChannel = message.guild.channels.cache.get(guildConfig?.modLogChannel);
      if (logChannel && logChannel.isTextBased()) {
        const truncated =
          message.content.length > 1024
            ? message.content.slice(0, 1021) + "..."
            : message.content;

        const logEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle(
            await t({ guildId: message.guild.id }, "AUTOMOD.ANTILINK.LOG.TITLE"),
          )
          .addFields(
            {
              name: await t({ guildId: message.guild.id }, "AUTOMOD.LOG.USER"),
              value: `${message.author.tag} (${message.author.id})`,
              inline: false,
            },
            {
              name: await t({ guildId: message.guild.id }, "AUTOMOD.LOG.MESSAGE"),
              value: truncated,
              inline: false,
            },
            {
              name: await t({ guildId: message.guild.id }, "AUTOMOD.LOG.CHANNEL"),
              value: `${message.channel}`,
              inline: true,
            },
            {
              name: await t({ guildId: message.guild.id }, "AUTOMOD.LOG.TOTAL_WARNS"),
              value: `${warnCount}`,
              inline: true,
            },
          )
          .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }

      // Timeout
      if (
        message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        const member = await message.guild.members.fetch(message.author.id);
        if (member.moderatable) {
          const ms = 10_000;
          await member.timeout(ms, reason).catch(() => {});

          const timeoutMessage = await message.channel.send({
            content: await t(
              { guildId: message.guild.id },
              "AUTOMOD.TIMEOUT.MESSAGE",
              { memberId: message.author.id, seconds: 10 },
            ),
            embeds: [
              new EmbedBuilder()
                .setColor("#FFA500")
                .setDescription(
                  await t(
                    { guildId: message.guild.id },
                    "AUTOMOD.TIMEOUT.DESCRIPTION",
                  ),
                )
                .setTimestamp(),
            ],
          });
          if (timeoutMessage.deletable)
            setTimeout(() => timeoutMessage.delete().catch(() => {}), 5000);
        }
      }
    } catch (error) {
      logger.error("Erreur lors de la gestion de l'antilink :", error);
    }
  },
};
