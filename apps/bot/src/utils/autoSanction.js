// utils/autoSanction.js
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfiguration = require("../models/GuildConfiguration");
const { t } = require("./t");

/**
 * Vérifie le nombre de warns et applique la sanction automatique
 * @param {import("discord.js").GuildMember} member
 * @param {number} warnCount
 */
async function checkAndSanction(member, warnCount) {
  if (!member || !member.guild) return;

  const guildConfig = await GuildConfiguration.findOne({
    guildId: member.guild.id,
  }).lean();
  if (!guildConfig?.autoSanction) return;

  let action;

  // Définir les actions selon le nombre de warns
  if (warnCount === 3) {
    action = "timeout";
  } else if (warnCount === 5) {
    action = "kick";
  } else if (warnCount === 7) {
    action = "ban";
  } else {
    return; // Pas d'action à prendre
  }

  const reasonText = await t({ guildId: member.guild.id }, "AUTOSANCTION.REASON", {
    warnCount,
  });

  try {
    const logChannel = member.guild.channels.cache.get(
      guildConfig?.modLogChannel,
    );

    if (action === "timeout") {
      if (
        member.guild.members.me.permissions.has(
          PermissionFlagsBits.ModerateMembers,
        )
      ) {
        await member.timeout(10 * 60 * 1000, reasonText);

        const embed = new EmbedBuilder()
          .setColor("#FFFF00")
          .setDescription(
            await t({ guildId: member.guild.id }, "AUTOSANCTION.LOG.TIMEOUT", {
              memberId: member.id,
              warnCount,
            }),
          )
          .setTimestamp();

        if (logChannel && logChannel.isTextBased())
          logChannel.send({ embeds: [embed] });
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
          logChannel.send({ embeds: [embed] });
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
          logChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error(
      `Erreur lors de la sanction automatique de ${member.user.tag}:`,
      error,
    );
  }
}

module.exports = { checkAndSanction };
