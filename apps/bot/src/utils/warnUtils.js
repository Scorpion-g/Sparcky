// utils/warnUtil.js
const Warn = require("../models/Warn");
const { checkAndSanction } = require("./autoSanction");

/**
 * Ajoute un warn à un membre et applique la sanction si nécessaire
 * @param {import("discord.js").GuildMember} member
 * @param {string} reason
 * @returns {number} le nombre total de warns
 */
async function addWarn(member, reason) {
  if (!member || !member.guild) return 0;

  const query = { userId: member.id, guildId: member.guild.id };
  let warnDoc = await Warn.findOne(query);

  const safeReason = typeof reason === "string" && reason.trim() ? reason : "";

  if (warnDoc) {
    warnDoc.warn += 1;
    if (safeReason) warnDoc.raison.push(safeReason);
  } else {
    warnDoc = new Warn({
      userId: member.id,
      guildId: member.guild.id,
      warn: 1,
      raison: safeReason ? [safeReason] : [],
    });
  }

  await warnDoc.save();

  // Auto-sanction centralisée
  await checkAndSanction(member, warnDoc.warn);

  return warnDoc.warn;
}

module.exports = { addWarn };
