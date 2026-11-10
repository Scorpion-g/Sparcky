const logger = require("../../utils/logger");
const { t } = require("../../utils/t");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    const guildId = newState.guild?.id;
    if (!guildId) return;

    const guildConfig = await GuildConfiguration.findOne({ guildId });
    if (!guildConfig || !guildConfig.vocChannelId) return;

    if (
      oldState.channelId !== newState.channelId &&
      newState.channelId === guildConfig.vocChannelId
    ) {
      const member = newState.member;
      if (!member) return;

      logger.info(`🎧 ${member.user.tag} a rejoint le salon de base !`);

      try {
        const baseChannel = newState.guild.channels.cache.get(
          guildConfig.vocChannelId,
        );
        if (!baseChannel) return;

        const defaultName = await t(
          { guildId },
          "VOICE.CREATE.DEFAULT_NAME",
          { username: member.user.username },
        );

        const prompt = await t(
          { guildId },
          "VOICE.CREATE.ASK_NAME",
          { member: `${member}` },
        );

        const askedMessage = await baseChannel.send(prompt);

        const nom = await new Promise((resolve) => {
          const filter = (m) => m.author.id === member.id;
          baseChannel
            .awaitMessages({
              filter,
              max: 1,
              time: 30000,
              errors: ["time"],
            })
            .then((collected) => {
              const response = collected.first()?.content?.trim();
              resolve(response || defaultName);
            })
            .catch(() => {
              resolve(defaultName);
            })
            .finally(() => {
              askedMessage.delete().catch(() => {});
            });
        });

        const newChannel = await newState.guild.channels.create({
          name: `${nom}`,
          type: 2,
          parent: newState.channel?.parent || null,
          permissionOverwrites: [
            {
              id: member.id,
              allow: [
                "Connect",
                "Speak",
                "MuteMembers",
                "DeafenMembers",
                "MoveMembers",
                "ManageChannels",
              ],
            },
            {
              id: newState.guild.roles.everyone,
              allow: ["Connect", "Speak"],
            },
          ],
        });

        if (member.voice.channelId) {
          await member.voice.setChannel(newChannel);
        }

        const checkEmpty = setInterval(async () => {
          if (newChannel.members.size === 0) {
            clearInterval(checkEmpty);
            await newChannel.delete().catch(() => {});
            logger.info(`🗑️ Salon ${newChannel.name} supprimé (vide).`);
          }
        }, 10000);
      } catch (error) {
        logger.error("Erreur lors de la création du salon vocal :", error);
      }
    }
  },
};
