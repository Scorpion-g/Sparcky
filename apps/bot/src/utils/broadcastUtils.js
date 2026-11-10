const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { CURRENT_VERSION, getChangelog } = require("@sparcky/database");
const GuildConfiguration = require("../models/GuildConfiguration");
const logger = require("./logger");

/**
 * Construit l'embed officiel d'annonce de mise à jour
 */
function buildReleaseEmbed(version = CURRENT_VERSION, client = null) {
  const release = getChangelog(version);
  const githubLink = release.githubUrl || `https://github.com/Scorpion-g/Sparcky/releases/tag/v${release.version}`;

  const embed = new EmbedBuilder()
    .setColor("#6366F1")
    .setTitle(`📢 ${release.title}`)
    .setDescription(
      `${release.summary}\n\n` +
      `**🌐 Panel Web :** [sparcky.matteoriviere.fr](https://sparcky.matteoriviere.fr)\n` +
      `**📦 GitHub Release :** [Scorpion-g/Sparcky (v${release.version})](${githubLink})\n\n` +
      `──────────────────────────────`
    )
    .setTimestamp();

  if (client?.user) {
    embed.setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
  }

  for (const item of release.highlights) {
    embed.addFields({
      name: `${item.emoji} ${item.title}`,
      value: item.desc,
      inline: false
    });
  }

  embed.setFooter({
    text: `God_Sparky v${release.version} • ${release.date} • Système de Versioning Automatique`,
    iconURL: client?.user?.displayAvatarURL()
  });

  return embed;
}

/**
 * Recherche le salon optimal pour diffuser l'annonce sur un serveur
 */
function findTargetChannel(guild, guildConfig) {
  const me = guild.members.me;
  if (!me) return null;

  function canSendIn(channel) {
    if (!channel || !channel.isTextBased() || channel.isVoiceBased() || channel.isThread?.()) return false;
    const perms = channel.permissionsFor(me);
    return perms?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks
    ]);
  }

  // 1. Salon explicitement configuré sur le panel
  if (guildConfig?.announcementChannel) {
    const ch = guild.channels.cache.get(guildConfig.announcementChannel);
    if (canSendIn(ch)) return ch;
  }

  // 2. Salon système officiel Discord du serveur
  if (canSendIn(guild.systemChannel)) {
    return guild.systemChannel;
  }

  // 3. Salon officiel des mises à jour de communauté Discord
  if (canSendIn(guild.publicUpdatesChannel)) {
    return guild.publicUpdatesChannel;
  }

  // 4. Salons favoris par nom (annonces, news, general, discussion)
  const preferredNames = ["annonces", "annonce", "news", "mises-a-jour", "general", "général", "discussion", "chat"];
  for (const name of preferredNames) {
    const ch = guild.channels.cache.find(
      (c) => c.name.toLowerCase().includes(name) && canSendIn(c)
    );
    if (ch) return ch;
  }

  // 5. N'importe quel salon textuel public valide (non-ticket, non-log, non-staff)
  const blacklistedTerms = ["ticket", "log", "mod", "admin", "staff", "sanction", "bot-test", "spam", "cmd", "commandes"];
  const candidate = guild.channels.cache.find((c) => {
    if (!canSendIn(c)) return false;
    const lowerName = c.name.toLowerCase();
    return !blacklistedTerms.some((term) => lowerName.includes(term));
  });

  if (candidate) return candidate;

  // 6. Dernier recours : premier salon textuel avec permissions d'envoi
  return guild.channels.cache.find(canSendIn) || null;
}

/**
 * Diffuse la mise à jour sur tous les serveurs où le bot est présent
 */
async function broadcastRelease(client, { version = CURRENT_VERSION, force = false, requestedBy = "System" } = {}) {
  const embed = buildReleaseEmbed(version, client);
  const guilds = [...client.guilds.cache.values()];

  const results = {
    version,
    totalGuilds: guilds.length,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    details: []
  };

  logger.info(`[BROADCAST] Début de la diffusion de la mise à jour v${version} demandée par ${requestedBy} sur ${guilds.length} serveurs...`);

  for (const guild of guilds) {
    try {
      const guildConfig = await GuildConfiguration.findOne({ guildId: guild.id }).lean();

      // Vérifier si la version a déjà été envoyée sur ce serveur
      if (!force && guildConfig?.lastAnnouncedVersion === version) {
        results.skippedCount++;
        results.details.push({
          guildId: guild.id,
          guildName: guild.name,
          status: "skipped",
          reason: `Déjà diffusé (v${version})`
        });
        continue;
      }

      const targetChannel = findTargetChannel(guild, guildConfig);

      if (!targetChannel) {
        results.failedCount++;
        results.details.push({
          guildId: guild.id,
          guildName: guild.name,
          status: "failed",
          reason: "Aucun salon textuel accessible avec permissions d'envoi d'embed"
        });
        continue;
      }

      await targetChannel.send({ embeds: [embed] });

      // Mettre à jour la version enregistrée pour éviter le spam
      await GuildConfiguration.updateOne(
        { guildId: guild.id },
        { $set: { lastAnnouncedVersion: version, updatedAt: new Date() } },
        { upsert: true }
      );

      results.sentCount++;
      results.details.push({
        guildId: guild.id,
        guildName: guild.name,
        channelId: targetChannel.id,
        channelName: targetChannel.name,
        status: "sent"
      });

      logger.info(`[BROADCAST] Envoyé avec succès sur "${guild.name}" (#${targetChannel.name})`);
    } catch (err) {
      results.failedCount++;
      results.details.push({
        guildId: guild.id,
        guildName: guild.name,
        status: "failed",
        reason: err.message
      });
      logger.error(`[BROADCAST] Échec d'envoi sur "${guild.name}": ${err.message}`);
    }
  }

  logger.info(`[BROADCAST] Terminé : ${results.sentCount}/${results.totalGuilds} envoyés, ${results.skippedCount} ignorés, ${results.failedCount} échecs.`);
  return results;
}

module.exports = {
  buildReleaseEmbed,
  findTargetChannel,
  broadcastRelease
};
