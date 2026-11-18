const { EmbedBuilder } = require('discord.js');
const GuildConfiguration = require('../../models/GuildConfiguration');
const logger = require('../../utils/logger');
const { t } = require('../../utils/t');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    try {
      const guildConfig = await GuildConfiguration.findOne({ guildId: member.guild.id });
      if (!guildConfig || !guildConfig.leaveChannel) return;

      const channel = member.guild.channels.cache.get(guildConfig.leaveChannel) ||
        await member.guild.channels.fetch(guildConfig.leaveChannel).catch(() => null);

      if (!channel || !channel.isTextBased()) return;

      const formatText = (str) => {
        if (!str) return '';
        return str
          .replace(/{username}/g, member.user?.username || 'Un membre')
          .replace(/{server}/g, member.guild.name)
          .replace(/{memberCount}/g, String(member.guild.memberCount || ''));
      };

      const hex = (guildConfig.leaveColor || '#EF4444').replace('#', '');
      const colorInt = Number.parseInt(hex, 16) || 0xef4444;

      const defaultTitle = await t({ guildId: member.guild.id }, 'LEAVE.TITLE', { username: member.user?.username || 'Membre' });
      const defaultDesc = await t({ guildId: member.guild.id }, 'LEAVE.DESCRIPTION', { guild: member.guild.name });

      const title = guildConfig.leaveTitle ? formatText(guildConfig.leaveTitle) : defaultTitle;
      const description = guildConfig.leaveMessage ? formatText(guildConfig.leaveMessage) : defaultDesc;

      const embed = new EmbedBuilder()
        .setColor(colorInt)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

      if (guildConfig.leaveThumbnail !== false && member.user?.displayAvatarURL) {
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
      }

      if (guildConfig.leaveImage) {
        embed.setImage(guildConfig.leaveImage);
      }

      await channel.send({ embeds: [embed] }).catch(err => logger.error('Erreur envoi au revoir:', err));
    } catch (error) {
      logger.error('Erreur event guildMemberRemove:', error);
    }
  },
};
