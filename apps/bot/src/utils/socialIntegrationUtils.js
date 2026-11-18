const { EmbedBuilder } = require("discord.js");
const logger = require("./logger");
const GuildConfiguration = require("../models/GuildConfiguration");

/**
 * Résout un handle YouTube (@nom), une URL ou un ID de chaîne vers le channelId et le titre
 */
async function resolveYouTubeChannel(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  // Si c'est déjà un channelId YouTube (commence par UC et 24 chars)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    try {
      const feedRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${trimmed}`);
      if (feedRes.ok) {
        const xml = await feedRes.text();
        const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
        return {
          channelId: trimmed,
          channelTitle: titleMatch ? titleMatch[1] : trimmed,
          channelHandle: trimmed
        };
      }
    } catch (e) {
      logger.warn(`[YOUTUBE_RESOLVE] Erreur vérification channelId direct: ${e?.message}`);
    }
  }

  // Si c'est une URL ou un handle @...
  let handle = trimmed;
  if (handle.includes("youtube.com/")) {
    const parts = handle.split("youtube.com/");
    handle = parts[1]?.split(/[?/#]/)[0] || handle;
  }
  if (!handle.startsWith("@") && !handle.startsWith("channel/")) {
    handle = `@${handle}`;
  }

  try {
    const url = handle.startsWith("channel/")
      ? `https://www.youtube.com/${handle}`
      : `https://www.youtube.com/${handle}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    if (!res.ok) return null;
    const html = await res.text();

    const rssMatch = html.match(/feeds\/videos\.xml\?channel_id=([^"]+)/);
    const channelId = rssMatch ? rssMatch[1] : null;
    if (!channelId) return null;

    // Récupérer le titre
    const feedRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    let channelTitle = handle;
    if (feedRes.ok) {
      const xml = await feedRes.text();
      const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) channelTitle = titleMatch[1];
    }

    return {
      channelId,
      channelTitle,
      channelHandle: handle
    };
  } catch (err) {
    logger.error(`[YOUTUBE_RESOLVE] Erreur résolution YouTube (${input}): ${err?.message}`);
    return null;
  }
}

/**
 * Récupère la dernière vidéo d'un flux YouTube
 */
async function fetchLatestYouTubeVideo(channelId) {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!res.ok) return null;
    const xml = await res.text();

    const channelTitleMatch = xml.match(/<title>([^<]+)<\/title>/);
    const channelTitle = channelTitleMatch ? channelTitleMatch[1] : "YouTube";

    const entries = xml.split("<entry>").slice(1);
    if (!entries.length) return null;

    const first = entries[0];
    const videoId = first.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const videoTitle = first.match(/<title>([^<]+)<\/title>/)?.[1];
    const published = first.match(/<published>([^<]+)<\/published>/)?.[1];

    if (!videoId) return null;

    return {
      channelTitle,
      videoId,
      videoTitle: videoTitle || "Nouvelle vidéo",
      published,
      url: `https://youtu.be/${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  } catch (err) {
    logger.warn(`[YOUTUBE_FEED] Erreur flux ${channelId}: ${err?.message}`);
    return null;
  }
}

/**
 * Vérifie le statut d'un stream Twitch via GQL public Twitch
 */
async function fetchTwitchStream(streamerLogin) {
  try {
    const login = streamerLogin.toLowerCase().trim();
    const query = `query { user(login: "${login}") { id displayName profileImageURL(width: 300) stream { id title game { name } viewersCount previewImageURL(width: 640, height: 360) } } }`;

    const res = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const user = json?.data?.user;
    if (!user) return null;

    const stream = user.stream;
    return {
      streamerLogin: login,
      streamerName: user.displayName || login,
      avatarUrl: user.profileImageURL || null,
      isLive: Boolean(stream),
      streamId: stream ? stream.id : null,
      title: stream?.title || null,
      game: stream?.game?.name || "Just Chatting",
      viewers: stream?.viewersCount || 0,
      previewUrl: stream?.previewImageURL || null,
      url: `https://twitch.tv/${login}`
    };
  } catch (err) {
    logger.warn(`[TWITCH_API] Erreur statut Twitch (${streamerLogin}): ${err?.message}`);
    return null;
  }
}

/**
 * Routine principale vérifiant toutes les alertes YouTube & Twitch pour tous les serveurs
 */
async function checkSocialIntegrations(client) {
  try {
    const configs = await GuildConfiguration.find({
      $or: [
        { "integrations.youtube.0": { $exists: true } },
        { "integrations.twitch.0": { $exists: true } }
      ]
    }).lean();

    for (const cfg of configs) {
      const guild = client.guilds.cache.get(cfg.guildId);
      if (!guild) continue;

      let configChanged = false;
      const updatedYoutube = cfg.integrations?.youtube ? [...cfg.integrations.youtube] : [];
      const updatedTwitch = cfg.integrations?.twitch ? [...cfg.integrations.twitch] : [];

      // 1. Alertes YouTube
      for (const yt of updatedYoutube) {
        if (!yt.enabled || !yt.channelId || !yt.discordChannelId) continue;

        const latestVideo = await fetchLatestYouTubeVideo(yt.channelId);
        if (!latestVideo) continue;

        // Première initialisation : mémoriser la dernière vidéo sans envoyer d'alerte rétroactive
        if (!yt.lastVideoId) {
          yt.lastVideoId = latestVideo.videoId;
          configChanged = true;
          continue;
        }

        // Nouvelle vidéo détectée !
        if (latestVideo.videoId !== yt.lastVideoId) {
          yt.lastVideoId = latestVideo.videoId;
          configChanged = true;

          const discordChannel = guild.channels.cache.get(yt.discordChannelId);
          if (discordChannel && discordChannel.isTextBased()) {
            const roleMention = yt.roleId ? (yt.roleId === "everyone" ? "@everyone" : `<@&${yt.roleId}> `) : "";
            const messageText = (yt.customMessage || "🎬 **Nouvelle vidéo de {author} !**\n\n📌 **{title}**\n👉 {url}")
              .replace(/\{author\}/g, latestVideo.channelTitle || yt.channelTitle || "YouTube")
              .replace(/\{title\}/g, latestVideo.videoTitle)
              .replace(/\{url\}/g, latestVideo.url);

            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle(latestVideo.videoTitle)
              .setURL(latestVideo.url)
              .setAuthor({
                name: latestVideo.channelTitle || "YouTube",
                iconURL: "https://www.youtube.com/s/desktop/f71fb3f4/img/favicon_144x144.png"
              })
              .setImage(latestVideo.thumbnailUrl)
              .setFooter({ text: "Sparcky • Alerte Vidéo YouTube" })
              .setTimestamp(new Date(latestVideo.published || Date.now()));

            await discordChannel.send({
              content: `${roleMention}${roleMention ? "\n" : ""}${messageText}`,
              embeds: [embed]
            }).catch(err => {
              logger.warn(`Impossible d'envoyer l'alerte YouTube dans #${discordChannel.name}: ${err?.message}`);
            });

            logger.info(`[YOUTUBE] Alerte envoyée pour ${latestVideo.channelTitle} (${latestVideo.videoId}) sur ${guild.name}`);
          }
        }
      }

      // 2. Alertes Twitch
      for (const tw of updatedTwitch) {
        if (!tw.enabled || !tw.streamerLogin || !tw.discordChannelId) continue;

        const status = await fetchTwitchStream(tw.streamerLogin);
        if (!status) continue;

        // Passage de offline à online (nouveau stream en direct)
        if (status.isLive && (!tw.isLive || (status.streamId && status.streamId !== tw.lastStreamId))) {
          tw.isLive = true;
          tw.lastStreamId = status.streamId;
          configChanged = true;

          const discordChannel = guild.channels.cache.get(tw.discordChannelId);
          if (discordChannel && discordChannel.isTextBased()) {
            const roleMention = tw.roleId ? (tw.roleId === "everyone" ? "@everyone" : `<@&${tw.roleId}> `) : "";
            const messageText = (tw.customMessage || "🔴 **{streamer} est en direct sur Twitch !**\n\n🎮 Jeu : **{game}**\n📌 **{title}**\n👉 {url}")
              .replace(/\{streamer\}/g, status.streamerName)
              .replace(/\{game\}/g, status.game)
              .replace(/\{title\}/g, status.title || "En direct")
              .replace(/\{url\}/g, status.url);

            const embed = new EmbedBuilder()
              .setColor(0x9146FF)
              .setTitle(status.title || `Live de ${status.streamerName}`)
              .setURL(status.url)
              .setAuthor({
                name: status.streamerName,
                iconURL: status.avatarUrl || undefined,
                url: status.url
              })
              .addFields(
                { name: "🎮 Jeu", value: status.game || "Inconnu", inline: true },
                { name: "👥 Spectateurs", value: `${status.viewers}`, inline: true }
              )
              .setFooter({ text: "Sparcky • Alerte Stream Twitch" })
              .setTimestamp();

            if (status.previewUrl) {
              embed.setImage(`${status.previewUrl}?t=${Date.now()}`);
            }

            await discordChannel.send({
              content: `${roleMention}${roleMention ? "\n" : ""}${messageText}`,
              embeds: [embed]
            }).catch(err => {
              logger.warn(`Impossible d'envoyer l'alerte Twitch dans #${discordChannel.name}: ${err?.message}`);
            });

            logger.info(`[TWITCH] Alerte envoyée pour ${status.streamerName} sur ${guild.name}`);
          }
        } else if (!status.isLive && tw.isLive) {
          // Passage de online à offline
          tw.isLive = false;
          configChanged = true;
        }
      }

      if (configChanged) {
        await GuildConfiguration.updateOne(
          { guildId: cfg.guildId },
          {
            $set: {
              "integrations.youtube": updatedYoutube,
              "integrations.twitch": updatedTwitch,
              updatedAt: new Date()
            }
          }
        );
      }
    }
  } catch (err) {
    logger.error(`[SOCIAL_INTEGRATIONS] Erreur cycle vérification: ${err?.message}`);
  }
}

module.exports = {
  resolveYouTubeChannel,
  fetchLatestYouTubeVideo,
  fetchTwitchStream,
  checkSocialIntegrations
};
