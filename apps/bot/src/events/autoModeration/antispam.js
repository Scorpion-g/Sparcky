const { EmbedBuilder, PermissionsBitField } = require("discord.js");
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
    if (!guildConfig || !guildConfig.antispam) return;

    const userMessages = client.userMessages || new Map();
    client.userMessages = userMessages;

    const now = Date.now();
    const timestamps = userMessages.get(message.author.id) || [];
    const filteredTimestamps = timestamps.filter((ts) => now - ts < 10000);
    filteredTimestamps.push(now);
    userMessages.set(message.author.id, filteredTimestamps);

    if (filteredTimestamps.length <= 5) return;

    try {
      if (message.deletable) await message.delete().catch(() => {});

      const reason = await t({ guildId: message.guild.id }, "AUTOMOD.ANTISPAM.REASON");

      const member = await message.guild.members.fetch(message.author.id);
      const warnCount = await addWarn(member, reason);

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

      const logChannel = message.guild.channels.cache.get(guildConfig?.modLogChannel);
      if (logChannel && logChannel.isTextBased()) {
        const truncated =
          message.content.length > 1024
            ? message.content.slice(0, 1021) + "..."
            : message.content;

        const logEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle(
            await t({ guildId: message.guild.id }, "AUTOMOD.ANTISPAM.LOG.TITLE"),
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

      if (
        message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)
      ) {
        const member = await message.guild.members.fetch(message.author.id);
        if (member.moderatable) {
          await member.timeout(60_000, reason).catch(() => {});
          const timeoutMessage = await message.channel.send({
            content: await t(
              { guildId: message.guild.id },
              "AUTOMOD.TIMEOUT.MESSAGE",
              { memberId: message.author.id, seconds: 60 },
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
      logger.error("Erreur lors de la gestion de l'antispam :", error);
    }
  },
};
