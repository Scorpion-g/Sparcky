const { EmbedBuilder } = require("discord.js");
const Level = require("../../models/Level");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");
const { t } = require("../../utils/t");
const { incrementQuestProgress } = require("../../utils/questUtils");
const { executeRcon } = require("../../utils/rcon");

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

      // --- Détection du statut VIP / Rôle Prestige pour booster l'XP et l'économie ---
      const isVip = Boolean(
        message.member?.roles?.cache?.some(r => {
          const n = r.name.toLowerCase();
          return n.includes("vip") || n.includes("personnage important") || n.includes("légende");
        })
      );

      // --- 1. Récompense économique passive par message (Chat-to-Earn) ---
      const economyEnabled = guildConfig?.economyEnabled !== false;
      const baseReward = guildConfig?.chatReward || 0;
      const chatReward = isVip ? baseReward * 2 : baseReward;
      if (economyEnabled && chatReward > 0) {
        await User.updateOne(
          { guildId, userId },
          { $inc: { balance: chatReward } },
          { upsert: true }
        ).catch(() => {});
      }

      // --- 2. Progression Quête Journalière ("messages") ---
      incrementQuestProgress(userId, guildId, "messages", 1).catch(() => {});

      // --- 3. Système d'XP et de Niveaux ---
      if (guildConfig && guildConfig.xpEnabled === false) {
        addCooldown(userId);
        return;
      }

      // Bonus VIP : 25 à 45 XP au lieu de 15 à 30 XP
      const xpToGive = isVip ? getRandomXp(25, 45) : getRandomXp(15, 30);
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

          let roleAwarded = null;
          let mcRewardSent = false;
          let mcPlayerName = null;

          // Attribution automatique du rôle de palier et récompense Minecraft si configuré
          if (Array.isArray(guildConfig?.levelRoles)) {
            const levelRoleConfig = guildConfig.levelRoles.find(
              (r) => Number(r.level) === Number(levelDoc.level)
            );
            if (levelRoleConfig) {
              if (levelRoleConfig.roleId) {
                const role = message.guild.roles.cache.get(levelRoleConfig.roleId);
                if (role && message.member) {
                  await message.member.roles.add(role).catch(err => {
                    logger.warn(`Impossible d'attribuer le rôle de niveau ${levelDoc.level}: ${err?.message}`);
                  });
                  roleAwarded = role.name;
                }
              }

              // Exécution de la commande RCON Minecraft si palier configuré
              if (levelRoleConfig.mcCommand && guildConfig.minecraft?.enabled && guildConfig.minecraft?.rconEnabled) {
                const userDoc = await User.findOne({ guildId, userId }).lean();
                if (userDoc?.minecraftUsername) {
                  mcPlayerName = userDoc.minecraftUsername;
                  const finalCmd = levelRoleConfig.mcCommand.replace(/\{player\}/gi, mcPlayerName);
                  try {
                    await executeRcon({
                      host: guildConfig.minecraft.ip,
                      port: guildConfig.minecraft.rconPort || 25575,
                      password: guildConfig.minecraft.rconPassword,
                      command: finalCmd,
                    });
                    mcRewardSent = true;
                    logger.info(`[LEVEL-REWARD] Commande MC envoyée à ${mcPlayerName}: "${finalCmd}"`);
                  } catch (mcErr) {
                    logger.warn(`[LEVEL-REWARD] Échec commande MC pour ${mcPlayerName}: ${mcErr.message}`);
                  }
                }
              }
            }
          }

          // Salon d'envoi du message de level-up
          if (guildConfig?.xpChannelId !== "none") {
            const targetChannel =
              guildConfig?.xpChannelId && guildConfig.xpChannelId !== ""
                ? message.guild.channels.cache.get(guildConfig.xpChannelId) || message.channel
                : message.channel;

            let desc = `Félicitations ${message.member}, vous venez d'atteindre le **Niveau ${levelDoc.level}** ! 🚀\n`;
            if (roleAwarded) {
              desc += `\n🎭 **Nouveau rôle débloqué :** \`@${roleAwarded}\` !`;
            }
            if (mcRewardSent && mcPlayerName) {
              desc += `\n🎁 **Cadeau In-Game :** Récompense envoyée à \`${mcPlayerName}\` sur Minecraft !`;
            }

            const embed = new EmbedBuilder()
              .setColor("#10B981")
              .setTitle("🎉 Nouveau Niveau Débloqué !")
              .setDescription(desc)
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
