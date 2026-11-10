const { EmbedBuilder } = require("discord.js");
const Level = require("../../models/Level");
const logger = require("../../utils/logger");
const { t } = require("../../utils/t");

// Cooldowns pour éviter le spam XP
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

    const xpToGive = getRandomXp(15, 30);
    const query = { userId: message.author.id, guildId: message.guild.id };

    try {
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

          const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle(await t(message, "LEVELING.LEVEL_UP.TITLE"))
            .setDescription(
              await t(message, "LEVELING.LEVEL_UP.DESCRIPTION", {
                member: `${message.member}`,
                level: levelDoc.level,
              }),
            )
            .setTimestamp();

          message.channel.send({ embeds: [embed] });
        }

        await levelDoc.save();
      } else {
        levelDoc = new Level({
          userId: message.author.id,
          guildId: message.guild.id,
          xp: xpToGive,
          level: 0,
        });
        await levelDoc.save();
      }

      addCooldown(message.author.id);
    } catch (err) {
      logger.error(`[XP] Erreur lors de l'attribution de XP : ${err}`);
    }
  },
};
