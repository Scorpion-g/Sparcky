const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const GuildConfiguration = require('../../models/GuildConfiguration');
const { t } = require('../../utils/t');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    try {
      const guildConfig = await GuildConfiguration.findOne({ guildId: member.guild.id });
      if (!guildConfig) return;

      const formatText = (str) => {
        if (!str) return '';
        return str
          .replace(/{user}/g, `<@${member.id}>`)
          .replace(/{username}/g, member.user.username)
          .replace(/{server}/g, member.guild.name)
          .replace(/{memberCount}/g, String(member.guild.memberCount || ''));
      };

      // 1. Message de bienvenue dans le salon dédié
      if (guildConfig.welcomeChannel) {
        const channel = member.guild.channels.cache.get(guildConfig.welcomeChannel) ||
          await member.guild.channels.fetch(guildConfig.welcomeChannel).catch(() => null);

        if (channel && channel.isTextBased()) {
          const hex = (guildConfig.welcomeColor || '#22C55E').replace('#', '');
          const colorInt = Number.parseInt(hex, 16) || 0x22c55e;

          const defaultTitle = await t({ guildId: member.guild.id }, 'WELCOME.TITLE', { username: member.user.username });
          const defaultDesc = await t({ guildId: member.guild.id }, 'WELCOME.DESCRIPTION', { guild: member.guild.name });

          const title = guildConfig.welcomeTitle ? formatText(guildConfig.welcomeTitle) : defaultTitle;
          const description = guildConfig.welcomeMessage ? formatText(guildConfig.welcomeMessage) : defaultDesc;

          const embed = new EmbedBuilder()
            .setColor(colorInt)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();

          if (guildConfig.welcomeThumbnail !== false) {
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
          }

          if (guildConfig.welcomeImage) {
            embed.setImage(guildConfig.welcomeImage);
          }

          await channel.send({ embeds: [embed] }).catch(err => logger.error('Erreur envoi bienvenue:', err));
        }
      }

      // 2. Message privé (DM) de bienvenue si activé
      if (guildConfig.welcomeDmEnabled && guildConfig.welcomeDmMessage) {
        try {
          const dmText = formatText(guildConfig.welcomeDmMessage);
          await member.send({ content: dmText });
        } catch {
          // L'utilisateur peut avoir fermé ses DMs
        }
      }

      // 3. Attribution du rôle automatique
      if (guildConfig.autoRole) {
        const role = member.guild.roles.cache.get(guildConfig.autoRole) ||
          await member.guild.roles.fetch(guildConfig.autoRole).catch(() => null);

        if (role) {
          await member.roles.add(role).catch(err => logger.error('Erreur attribution rôle auto:', err));
        }
      }
    } catch (error) {
      logger.error('Erreur event guildMemberAdd:', error);
    }
  },
};
