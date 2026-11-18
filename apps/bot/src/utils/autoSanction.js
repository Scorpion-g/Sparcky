// utils/autoSanction.js
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfiguration = require("../models/GuildConfiguration");
const { t } = require("./t");

/**
 * Vérifie le nombre de warns et applique la sanction automatique configurée
 * @param {import("discord.js").GuildMember} member
 * @param {number} warnCount
 */
async function checkAndSanction(member, warnCount) {
  if (!member || !member.guild) return;

  const guildConfig = await GuildConfiguration.findOne({
    guildId: member.guild.id,
  }).lean();
  if (!guildConfig?.autoSanction) return;

  const rules = Array.isArray(guildConfig.autoSanctionRules) && guildConfig.autoSanctionRules.length > 0
    ? guildConfig.autoSanctionRules
    : [
        { warnCount: 3, action: "timeout", durationMinutes: 10 },
        { warnCount: 5, action: "kick", durationMinutes: 0 },
        { warnCount: 7, action: "ban", durationMinutes: 0 }
      ];

  const matchedRule = rules.find(r => Number(r.warnCount) === Number(warnCount));
  if (!matchedRule) return;

  const action = matchedRule.action;
  const durationMinutes = Math.max(1, Number(matchedRule.durationMinutes) || 10);

  const reasonText = await t({ guildId: member.guild.id }, "AUTOSANCTION.REASON", {
    warnCount,
  });

  try {
    const logChannel = member.guild.channels.cache.get(
      guildConfig?.modLogChannel,
    ) || await member.guild.channels.fetch(guildConfig?.modLogChannel).catch(() => null);

    if (action === "timeout") {
      if (
        member.guild.members.me.permissions.has(
          PermissionFlagsBits.ModerateMembers,
        ) && member.moderatable
      ) {
        await member.timeout(durationMinutes * 60 * 1000, reasonText);

        const embed = new EmbedBuilder()
          .setColor("#FFFF00")
          .setDescription(
            await t({ guildId: member.guild.id }, "AUTOSANCTION.LOG.TIMEOUT", {
              memberId: member.id,
              warnCount,
            }) + ` (${durationMinutes}m)`,
          )
          .setTimestamp();

        if (logChannel && logChannel.isTextBased())
          await logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    } else if (action === "kick") {
      if (member.kickable) {
        await member.kick(reasonText);

        const embed = new EmbedBuilder()
          .setColor("#FFA500")
          .setDescription(
            await t({ guildId: member.guild.id }, "AUTOSANCTION.LOG.KICK", {
              memberId: member.id,
              warnCount,
            }),
          )
          .setTimestamp();

        if (logChannel && logChannel.isTextBased())
          await logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    } else if (action === "ban") {
      if (member.bannable) {
        await member.ban({ reason: reasonText });

        const embed = new EmbedBuilder()
          .setColor("#FF0000")
          .setDescription(
            await t({ guildId: member.guild.id }, "AUTOSANCTION.LOG.BAN", {
              memberId: member.id,
              warnCount,
            }),
          )
          .setTimestamp();

        if (logChannel && logChannel.isTextBased())
          await logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error(
      `Erreur lors de la sanction automatique de ${member.user?.tag || member.id}:`,
      error,
    );
  }
}

module.exports = { checkAndSanction };
