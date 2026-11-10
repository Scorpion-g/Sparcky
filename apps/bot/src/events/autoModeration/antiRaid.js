const { EmbedBuilder } = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");
const { t } = require("../../utils/t");

module.exports = {
  name: "guildMemberAdd",
  async execute(client, member) {
    try {
      const guildId = member.guild.id;

      const guildConfig = await GuildConfiguration.findOne({ guildId });
      if (!guildConfig || !guildConfig.antiRaid) return;

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle(await t({ guildId }, "AUTOMOD.ANTIRAID.LOG.TITLE"))
        .setDescription(
          await t({ guildId }, "AUTOMOD.ANTIRAID.LOG.DESCRIPTION", {
            tag: member.user.tag,
          }),
        )
        .setTimestamp();

      const logChannelId = guildConfig.modLogChannel;
      if (logChannelId) {
        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      try {
        await member.send(await t({ guildId }, "AUTOMOD.ANTIRAID.DM"));
      } catch (err) {
        logger.error("Impossible d'envoyer un MP au membre:", err);
      }

      const kickReason = await t({ guildId }, "AUTOMOD.ANTIRAID.KICK_REASON");
      await member.kick(kickReason).catch(() => {});
    } catch (error) {
      logger.error("Erreur event guildMemberAdd:", error);
    }
  },
};
