const { EmbedBuilder } = require("discord.js");
const Level = require("../../models/Level");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");
const { t } = require("../../utils/t");

// Cooldowns pour éviter le spam XP et récompenses chat
const cooldowns = new Set();

/**
 * Ajoute un cooldown pour un utilisateur
 * @param {string} userId
 * @param {number} duration
 */
function addCooldown(userId, duration = 60000) {
  cooldowns.add(userId);
  setTimeout(() => cooldowns.delete(userId), duration);
}

/**
 * Donne un nombre aléatoire d'XP
 * @param {number} min
 * @param {number} max
 */
function getRandomXp(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Event messageCreate pour donner de l'XP
 * @param {Message} message
 */
module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (cooldowns.has(message.author.id)) return;

    try {
      const guildId = message.guild.id;
      const userId = message.author.id;

      const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();

      // --- 1. Récompense économique passive par message (Chat-to-Earn) ---
      const chatReward = guildConfig?.chatReward || 0;
      if (chatReward > 0) {
        await User.updateOne(
          { guildId, userId },
          { $inc: { balance: chatReward } },
          { upsert: true }
        ).catch(() => {});
      }

      // --- 2. Système d'XP et de Niveaux ---
      if (guildConfig && guildConfig.xpEnabled === false) {
        addCooldown(userId);
        return;
      }

      const xpToGive = getRandomXp(15, 30);
      const query = { userId, guildId };

      let levelDoc = await Level.findOne(query);

      if (levelDoc) {
        levelDoc.xp += xpToGive;

        // Level up si nécessaire
        while (
          levelDoc.xp >= require("../../utils/calculateLevelXp")(levelDoc.level)
        ) {
          levelDoc.xp -= require("../../utils/calculateLevelXp")(
            levelDoc.level,
          );
          levelDoc.level++;

          // Attribution automatique du rôle de palier si configuré
          if (Array.isArray(guildConfig?.levelRoles)) {
            const levelRoleConfig = guildConfig.levelRoles.find(
              (r) => Number(r.level) === Number(levelDoc.level)
            );
            if (levelRoleConfig && levelRoleConfig.roleId) {
              const role = message.guild.roles.cache.get(levelRoleConfig.roleId);
              if (role && message.member) {
                await message.member.roles.add(role).catch(err => {
                  logger.warn(`Impossible d'attribuer le rôle de niveau ${levelDoc.level}: ${err?.message}`);
                });
              }
            }
          }

          // Salon d'envoi du message de level-up
          if (guildConfig?.xpChannelId !== "none") {
            const targetChannel =
              guildConfig?.xpChannelId && guildConfig.xpChannelId !== ""
                ? message.guild.channels.cache.get(guildConfig.xpChannelId) || message.channel
                : message.channel;

            const embed = new EmbedBuilder()
              .setColor("#10B981")
              .setTitle("🎉 Nouveau Niveau Débloqué !")
              .setDescription(`Félicitations ${message.member}, vous venez d'atteindre le **Niveau ${levelDoc.level}** ! 🚀`)
              .setThumbnail(message.author.displayAvatarURL())
              .setTimestamp();

            if (targetChannel && targetChannel.isTextBased()) {
              targetChannel.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }

        await levelDoc.save();
      } else {
        levelDoc = new Level({
          userId,
          guildId,
          xp: xpToGive,
          level: 0,
        });
        await levelDoc.save();
      }

      addCooldown(userId);
    } catch (err) {
      logger.error(`[XP] Erreur lors de l'attribution de XP : ${err?.message}`);
    }
  },
};
