const GuildConfiguration = require("../models/GuildConfiguration");
const logger = require("./logger");
const util = require("minecraft-server-util");

/**
 * Met à jour les salons statistiques vocaux (Voice Counters) d'une guilde
 */
async function updateVoiceCounters(client, guildId) {
  try {
    const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
    if (!guild) return;

    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    if (!guildConfig?.voiceCounters?.enabled) return;

    const { memberChannelId, mcChannelId } = guildConfig.voiceCounters;

    // 1. Compteur de membres Discord
    if (memberChannelId) {
      const memberChan = guild.channels.cache.get(memberChannelId) || (await guild.channels.fetch(memberChannelId).catch(() => null));
      if (memberChan && memberChan.isVoiceBased()) {
        const count = guild.memberCount || 0;
        const targetName = `👥 Membres : ${count.toLocaleString()}`;
        if (memberChan.name !== targetName) {
          await memberChan.setName(targetName).catch((err) => {
            logger.warn(`[VOICE-COUNTERS] Erreur renommage salon membres: ${err.message}`);
          });
        }
      }
    }

    // 2. Compteur de joueurs Minecraft
    if (mcChannelId && guildConfig.minecraft?.ip) {
      const mcChan = guild.channels.cache.get(mcChannelId) || (await guild.channels.fetch(mcChannelId).catch(() => null));
      if (mcChan && mcChan.isVoiceBased()) {
        let isOnline = false;
        let onlineCount = 0;
        let maxCount = 0;

        try {
          const res = await util.status(
            guildConfig.minecraft.ip,
            guildConfig.minecraft.port || 25565,
            { timeout: 3500 }
          );
          isOnline = true;
          onlineCount = res.players?.online || 0;
          maxCount = res.players?.max || 0;
        } catch {
          isOnline = false;
        }

        const targetName = isOnline
          ? `🟢 En jeu : ${onlineCount}/${maxCount}`
          : `🔴 Serveur Hors-Ligne`;

        if (mcChan.name !== targetName) {
          await mcChan.setName(targetName).catch((err) => {
            logger.warn(`[VOICE-COUNTERS] Erreur renommage salon MC: ${err.message}`);
          });
        }
      }
    }

    // Mise à jour de la date de dernier rafraîchissement
    await GuildConfiguration.updateOne(
      { guildId },
      { $set: { "voiceCounters.lastUpdate": new Date() } }
    ).catch(() => {});
  } catch (err) {
    logger.warn(`[VOICE-COUNTERS] Erreur updateVoiceCounters (${guildId}): ${err.message}`);
  }
}

/**
 * Met à jour les salons statistiques de tous les serveurs du bot
 */
async function updateAllVoiceCounters(client) {
  for (const guild of client.guilds.cache.values()) {
    await updateVoiceCounters(client, guild.id);
  }
}

module.exports = {
  updateVoiceCounters,
  updateAllVoiceCounters,
};
