const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { containsBadWord } = require("../../utils/badWordUtils");
const { addWarn } = require("../../utils/warnUtils");
const logger = require("../../utils/logger");
const { t } = require("../../utils/t");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;

    const guildConfig = await GuildConfiguration.findOne({ guildId });

    // ✅ Ici c'est bien antiBadWords (et pas antilink)
    if (!guildConfig?.antiBadWords) return;

    const serverBadWords = guildConfig?.badWords || [];
    const messageContent = message.content;

    const badWordsList = [...serverBadWords];

    if (!containsBadWord(messageContent, badWordsList)) return;

    try {
      if (message.deletable) await message.delete().catch(() => {});

      const warningEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(
          await t(
            { guildId },
            "AUTOMOD.ANTIBADWORDS.WARNING",
            { userId: message.author.id },
          ),
        )
        .setTimestamp();

      const warningMsg = await message.channel.send({ embeds: [warningEmbed] });
      if (warningMsg.deletable) {
        setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
      }

      if (
        message.guild.members.me.permissions.has(
          PermissionFlagsBits.ModerateMembers,
        )
      ) {
        const reason = await t({ guildId }, "AUTOMOD.ANTIBADWORDS.REASON");

        await message.member.timeout(10 * 1000, reason).catch(() => {});

        const timeoutEmbed = new EmbedBuilder()
          .setColor("#FFA500")
          .setDescription(
            await t(
              { guildId },
              "AUTOMOD.ANTIBADWORDS.TIMEOUT",
              { userId: message.author.id, seconds: 10 },
            ),
          )
          .setTimestamp();

        const timeoutMsg = await message.channel.send({ embeds: [timeoutEmbed] });
        if (timeoutMsg.deletable)
          setTimeout(() => timeoutMsg.delete().catch(() => {}), 5000);

        const warnCount = await addWarn(message.member, reason);

        await message.author
          .send({
            embeds: [
              new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle(
                  await t({ guildId }, "AUTOMOD.DM.WARN_TITLE", {
                    guild: message.guild.name,
                  }),
                )
                .addFields(
                  {
                    name: await t({ guildId }, "COMMON.REASON"),
                    value: reason,
                  },
                  {
                    name: await t({ guildId }, "AUTOMOD.DM.TOTAL_WARNS"),
                    value: `${warnCount}`,
                  },
                )
                .setTimestamp(),
            ],
          })
          .catch(() => {});

        const logChannel = message.guild.channels.cache.get(
          guildConfig?.modLogChannel,
        );
        if (logChannel && logChannel.isTextBased()) {
          const truncated =
            messageContent.length > 1024
              ? messageContent.slice(0, 1021) + "..."
              : messageContent;

          const logEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle(await t({ guildId }, "AUTOMOD.ANTIBADWORDS.LOG.TITLE"))
            .addFields(
              {
                name: await t({ guildId }, "AUTOMOD.LOG.USER"),
                value: `${message.author.tag} (${message.author.id})`,
                inline: false,
              },
              {
                name: await t({ guildId }, "AUTOMOD.LOG.MESSAGE"),
                value: truncated,
                inline: false,
              },
              {
                name: await t({ guildId }, "AUTOMOD.LOG.CHANNEL"),
                value: `${message.channel}`,
                inline: true,
              },
              {
                name: await t({ guildId }, "AUTOMOD.LOG.TOTAL_WARNS"),
                value: `${warnCount}`,
                inline: true,
              },
            )
            .setTimestamp();

          logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }
    } catch (error) {
      logger.error("Erreur lors de la gestion des mots interdits :", error);
    }
  },
};
