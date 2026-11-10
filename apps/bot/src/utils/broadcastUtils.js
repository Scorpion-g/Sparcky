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
      `**🎮 Sandbox Démo :** [sparcky.matteoriviere.fr/demo](https://sparcky.matteoriviere.fr/demo)\n` +
      `**📦 GitHub Release :** [Scorpion-g/Sparcky (v${release.version})](${githubLink})\n\n` +
      `──────────────────────────────`
    )
    .setTimestamp();

  if (client?.user) {
    embed.setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
  }

  for (const item of release.highlights) {
    embed.addFields({
      name: `${item.emoji || "✨"} ${item.title}`,
      value: item.desc,
      inline: item.inline !== undefined ? item.inline : true
    });
  }

  embed.setFooter({
    text: `God_Sparky v${release.version} • ${release.date} • Système de Versioning Automatique`,
    iconURL: client?.user?.displayAvatarURL()
  });

  return embed;
}

function cleanChannelName(str = "") {
  return String(str || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isBlacklistedChannel(name = "") {
  const cl = cleanChannelName(name);
  const blacklisted = [
    "reglement", "regle", "rule", "charte", "loi",
    "bienvenue", "welcome", "arrivee", "depart", "leave",
    "ticket", "log", "mod", "admin", "staff", "sanction", "warn",
    "bot", "cmd", "test", "spam",
    "role", "grade", "autorole", "reaction",
    "faq", "info", "partenaire", "partenariat", "partner",
    "vocal", "voice", "boost", "nitro",
    "media", "photo", "image", "clip", "video", "meme"
  ];
  return blacklisted.some(b => cl.includes(b));
}

function isAnnouncementChannel(name = "") {
  const cl = cleanChannelName(name);
  const preferred = ["annonce", "news", "miseajour", "misesajour", "update"];
  return preferred.some(p => cl.includes(p));
}

function isDiscussionChannel(name = "") {
  const cl = cleanChannelName(name);
  const preferred = ["general", "discussion", "chat", "conversation", "communaute", "blabla", "principal"];
  return preferred.some(p => cl.includes(p));
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

  // 2. Salon d'annonces dédié (non blacklisté)
  const annCh = guild.channels.cache.find(
    (c) => canSendIn(c) && isAnnouncementChannel(c.name) && !isBlacklistedChannel(c.name)
  );
  if (annCh) return annCh;

  // 3. Salon système officiel Discord du serveur (si non blacklisté)
  if (guild.systemChannel && canSendIn(guild.systemChannel) && !isBlacklistedChannel(guild.systemChannel.name)) {
    return guild.systemChannel;
  }

  // 4. Salon général / discussion principal (non blacklisté)
  const discCh = guild.channels.cache.find(
    (c) => canSendIn(c) && isDiscussionChannel(c.name) && !isBlacklistedChannel(c.name)
  );
  if (discCh) return discCh;

  // 5. N'importe quel salon textuel public valide NON blacklisté
  const validCandidate = guild.channels.cache.find(
    (c) => canSendIn(c) && !isBlacklistedChannel(c.name)
  );
  if (validCandidate) return validCandidate;

  // 6. Salon de mises à jour de communauté Discord
  if (guild.publicUpdatesChannel && canSendIn(guild.publicUpdatesChannel) && !isBlacklistedChannel(guild.publicUpdatesChannel.name)) {
    return guild.publicUpdatesChannel;
  }

  // 7. Dernier recours strict : exclure impérativement les règlements et les logs
  return guild.channels.cache.find(
    (c) => canSendIn(c) && !cleanChannelName(c.name).includes("regle") && !cleanChannelName(c.name).includes("rule") && !cleanChannelName(c.name).includes("log")
  ) || null;
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
