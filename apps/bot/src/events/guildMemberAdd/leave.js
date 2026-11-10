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

      const channel = member.guild.channels.cache.get(guildConfig.leaveChannel);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle(await t({ guildId: member.guild.id }, 'LEAVE.TITLE', { username: member.user.username }))
        .setDescription(await t({ guildId: member.guild.id }, 'LEAVE.DESCRIPTION', { guild: member.guild.name }))
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

      channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Erreur event guildMemberAdd:', error);
    }
  },
};
