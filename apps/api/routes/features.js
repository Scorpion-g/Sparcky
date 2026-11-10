import express from "express"
import { ObjectId } from "mongodb"
import { authenticate } from "../middlewares/auth.js"
import { getDb } from "../lib/mongo.js"
import { CURRENT_VERSION, getChangelog, GITHUB_REPO, getGitHubReleaseUrl } from "@sparcky/database"
import axios from "axios"

const router = express.Router()

function getBotToken() {
  return process.env.DISCORD_BOT_TOKEN
}

// ==========================================
// MODULE 3 : GESTION DES TICKETS
// ==========================================
router.get("/guilds/:guildId/tickets", authenticate, async (req, res) => {
  const { guildId } = req.params

  try {
    const db = await getDb()
    const settings = await db.collection("ticketsettings").findOne({ guildId })

    let openTickets = []
    const token = getBotToken()

    if (settings?.ticketCategoryId && token) {
      try {
        const chRes = await axios.get(`https://discord.com/api/guilds/${guildId}/channels`, {
          headers: { Authorization: `Bot ${token}` }
        })
        if (Array.isArray(chRes.data)) {
          openTickets = chRes.data
            .filter(c => c.parent_id === settings.ticketCategoryId && c.name?.startsWith("ticket-"))
            .map(c => ({
              id: c.id,
              name: c.name,
              topic: c.topic || null,
              position: c.position
            }))
        }
      } catch (err) {
        console.warn("Erreur récupération salons tickets Discord:", err?.message)
      }
    }

    return res.json({
      guildId,
      settings: settings || null,
      openTickets
    })
  } catch (err) {
    console.error("GET /api/guilds/:guildId/tickets error:", err)
    return res.status(500).json({ error: "Impossible de charger les tickets" })
  }
})

// Envoyer ou renvoyer le panneau interactif de tickets sur Discord
router.post("/guilds/:guildId/tickets/send-panel", authenticate, async (req, res) => {
  const { guildId } = req.params
  const {
    channelId,
    title = "🎫 Système de Ticket",
    description = "Si tu as besoin d'aide ouvre un ticket correspondant à ta demande",
    color = "#0099FF",
    supportRoleId,
    ticketCategoryId,
    logChannelId,
    types = ["suggestion", "partenariats", "problème", "autre"]
  } = req.body || {}

  if (!channelId) {
    return res.status(400).json({ error: "Salon Discord (channelId) requis" })
  }

  const token = getBotToken()
  if (!token) return res.status(500).json({ error: "DISCORD_BOT_TOKEN manquant" })

  try {
    const hex = color.replace("#", "")
    const colorInt = Number.parseInt(hex, 16) || 0x0099ff

    const cleanTypes = Array.isArray(types) && types.length > 0
      ? types.map(t => String(t).trim()).filter(Boolean)
      : ["suggestion", "partenariats", "problème", "autre"]

    // Composant Menu Déroulant (StringSelectMenu = type 3)
    const selectMenu = {
      type: 3,
      custom_id: "ticket_menu",
      placeholder: "Sélectionnez le type de ticket",
      min_values: 1,
      max_values: 1,
      options: cleanTypes.map(t => ({
        label: t,
        value: t,
        description: `Ouvrir un ticket ${t}`,
        emoji: { name: "🎫" }
      }))
    }

    const actionRow = {
      type: 1, // ActionRow
      components: [selectMenu]
    }

    const embed = {
      title,
      description,
      color: colorInt,
      footer: { text: "God_Sparky • Support & Assistance" },
      timestamp: new Date().toISOString()
    }

    // Envoi du message sur Discord dans le salon spécifié
    const discordRes = await axios.post(
      `https://discord.com/api/channels/${channelId}/messages`,
      { embeds: [embed], components: [actionRow] },
      { headers: { Authorization: `Bot ${token}` } }
    )

    // Enregistrement en base de données dans ticketsettings
    const db = await getDb()
    await db.collection("ticketsettings").updateOne(
      { guildId },
      {
        $set: {
          guildId,
          panelChannelId: channelId,
          panelMessageId: discordRes.data?.id || null,
          supportRoleId: supportRoleId || null,
          ticketCategoryId: ticketCategoryId || null,
          logChannelId: logChannelId || null,
          ticketTypes: cleanTypes,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    return res.json({ success: true, messageId: discordRes.data?.id, channelId })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/tickets/send-panel error:", err?.response?.data || err?.message)
    return res.status(err?.response?.status || 500).json({
      error: err?.response?.data?.message || "Impossible d'envoyer le panneau sur Discord"
    })
  }
})

// Fermer un salon de ticket depuis le web
router.delete("/guilds/:guildId/tickets/:channelId", authenticate, async (req, res) => {
  const { channelId } = req.params
  const token = getBotToken()

  if (!token) return res.status(500).json({ error: "DISCORD_BOT_TOKEN manquant" })

  try {
    await axios.delete(`https://discord.com/api/channels/${channelId}`, {
      headers: { Authorization: `Bot ${token}` }
    })
    return res.json({ success: true, channelId })
  } catch (err) {
    return res.status(err?.response?.status || 500).json({
      error: err?.response?.data?.message || "Impossible de fermer le ticket"
    })
  }
})

// ==========================================
// MODULE 4 : EMBED BUILDER (ENVOI D'ANNONCES)
// ==========================================
router.post("/guilds/:guildId/embed", authenticate, async (req, res) => {
  const { guildId } = req.params
  const {
    channelId,
    title,
    description,
    color = "#6366F1",
    image,
    thumbnail,
    footer,
    fields,
    author,
    authorIcon
  } = req.body || {}

  const hasDesc = Boolean(description && String(description).trim())
  const hasFields = Array.isArray(fields) && fields.some(f => f && String(f.name || "").trim() && String(f.value || "").trim())
  const hasTitle = Boolean(title && String(title).trim())
  const hasImage = Boolean(image && String(image).startsWith("http"))

  if (!channelId || (!hasDesc && !hasFields && !hasTitle && !hasImage)) {
    return res.status(400).json({ error: "Le salon Discord et au moins un titre, une description, un champ ou une image sont obligatoires." })
  }

  const token = getBotToken()
  if (!token) return res.status(500).json({ error: "DISCORD_BOT_TOKEN manquant" })

  try {
    // Parser la couleur hex en entier
    const hex = String(color || "").replace("#", "")
    const colorInt = Number.parseInt(hex, 16) || 0x6366f1

    const embed = {
      color: colorInt,
      timestamp: new Date().toISOString()
    }

    if (hasTitle) embed.title = String(title).trim().slice(0, 256)
    if (hasDesc) embed.description = String(description).trim().slice(0, 4096)

    if (author && String(author).trim()) {
      embed.author = {
        name: String(author).trim().slice(0, 256),
        icon_url: authorIcon && String(authorIcon).startsWith("http") ? String(authorIcon).trim() : undefined
      }
    }

    if (hasFields) {
      embed.fields = fields
        .filter(f => f && typeof f === "object" && String(f.name || "").trim() && String(f.value || "").trim())
        .slice(0, 25)
        .map(f => ({
          name: String(f.name).trim().slice(0, 256),
          value: String(f.value).trim().slice(0, 1024),
          inline: Boolean(f.inline)
        }))
    }

    if (hasImage) embed.image = { url: String(image).trim() }
    if (thumbnail && String(thumbnail).startsWith("http")) embed.thumbnail = { url: String(thumbnail).trim() }
    if (footer && String(footer).trim()) embed.footer = { text: String(footer).trim().slice(0, 2048) }

    await axios.post(
      `https://discord.com/api/channels/${channelId}/messages`,
      { embeds: [embed] },
      { headers: { Authorization: `Bot ${token}` } }
    )

    return res.json({ success: true, channelId })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/embed error:", err?.response?.data || err?.message)
    return res.status(err?.response?.status || 500).json({
      error: err?.response?.data?.message || "Impossible d'envoyer l'embed sur Discord"
    })
  }
})

// ==========================================
// MODULE 5 : MODERATION WARNS WEB
// ==========================================
router.get("/guilds/:guildId/moderation/warns", authenticate, async (req, res) => {
  const { guildId } = req.params

  try {
    const db = await getDb()
    const warns = await db
      .collection("warns")
      .find({ guildId, warn: { $gt: 0 } })
      .toArray()

    const token = getBotToken()

    const enriched = await Promise.all(
      warns.map(async w => {
        let username = `Utilisateur ${w.userId}`
        let avatarUrl = null

        if (token) {
          try {
            const uRes = await axios.get(`https://discord.com/api/users/${w.userId}`, {
              headers: { Authorization: `Bot ${token}` }
            })
            username = uRes.data.global_name || uRes.data.username
            if (uRes.data.avatar) {
              avatarUrl = `https://cdn.discordapp.com/avatars/${w.userId}/${uRes.data.avatar}.png?size=128`
            }
          } catch {
            // Ignorer
          }
        }

        return {
          id: w._id,
          userId: w.userId,
          username,
          avatarUrl,
          warnCount: w.warn || 0,
          unwarnCount: w.unwarn || 0,
          reasons: Array.isArray(w.raison) ? w.raison : []
        }
      })
    )

    return res.json({ guildId, warns: enriched })
  } catch (err) {
    console.error("GET /api/guilds/:guildId/moderation/warns error:", err)
    return res.status(500).json({ error: "Impossible de charger les avertissements" })
  }
})

// Révoquer un avertissement
router.post("/guilds/:guildId/moderation/warns/:userId/revoke", authenticate, async (req, res) => {
  const { guildId, userId } = req.params

  try {
    const db = await getDb()
    const warnCol = db.collection("warns")

    const existing = await warnCol.findOne({ guildId, userId })
    if (!existing || existing.warn <= 0) {
      return res.status(404).json({ error: "Aucun avertissement actif pour cet utilisateur" })
    }

    const newWarn = Math.max(0, existing.warn - 1)
    await warnCol.updateOne(
      { guildId, userId },
      {
        $set: { warn: newWarn, updatedAt: new Date() },
        $inc: { unwarn: 1 }
      }
    )

    return res.json({ success: true, userId, remainingWarns: newWarn })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/moderation/warns/:userId/revoke error:", err)
    return res.status(500).json({ error: "Impossible de révoquer l'avertissement" })
  }
})

// ==========================================
// MODULE 5.5 : GESTION DES GIVEAWAYS
// ==========================================

// 1. Lister les giveaways d'une guilde
router.get("/guilds/:guildId/giveaways", authenticate, async (req, res) => {
  const { guildId } = req.params
  try {
    const db = await getDb()
    const giveaways = await db
      .collection("Giveaways")
      .find({ guildId })
      .sort({ createdAt: -1 })
      .toArray()

    const formatted = giveaways.map((g) => ({
      id: g._id.toString(),
      prize: g.prize,
      channelId: g.channelId,
      messageId: g.messageId,
      endTime: g.endTime,
      winnersCount: g.winnersCount || 1,
      participantsCount: Array.isArray(g.participants) ? g.participants.length : 0,
      participants: g.participants || [],
      winners: g.winners || [],
      hostedBy: g.hostedBy || null,
      isEnded: !!g.isEnded,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }))

    return res.json({ giveaways: formatted })
  } catch (err) {
    console.error("GET /api/guilds/:guildId/giveaways error:", err)
    return res.status(500).json({ error: "Impossible de récupérer les giveaways" })
  }
})

// 2. Créer et lancer un giveaway depuis le panel
router.post("/guilds/:guildId/giveaways", authenticate, async (req, res) => {
  const { guildId } = req.params
  const { prize, durationMinutes = 60, winnersCount = 1, channelId } = req.body || {}

  if (!channelId) {
    return res.status(400).json({ error: "Le salon Discord (channelId) est requis" })
  }
  if (!prize || !String(prize).trim()) {
    return res.status(400).json({ error: "Le lot à gagner (prize) est requis" })
  }

  const duration = Math.max(1, Number.parseInt(durationMinutes, 10) || 60)
  const winners = Math.max(1, Number.parseInt(winnersCount, 10) || 1)
  const token = getBotToken()
  if (!token) return res.status(500).json({ error: "DISCORD_BOT_TOKEN manquant" })

  try {
    const giveawayId = new ObjectId()
    const endTime = new Date(Date.now() + duration * 60000)
    const endTimestamp = Math.floor(endTime.getTime() / 1000)

    const embed = {
      title: `🎉 GIVEAWAY : ${prize.trim()}`,
      description:
        `Cliquez sur le bouton **Participer** ci-dessous pour tenter votre chance !\n\n` +
        `🎁 **Lot à gagner :** **${prize.trim()}**\n` +
        `🏆 **Nombre de gagnant(s) :** \`${winners}\`\n` +
        `⏰ **Fin du tirage :** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)\n` +
        `👤 **Organisé par :** Panneau Web (${req.user?.username || "Admin"})\n` +
        `👥 **Participants actuels :** \`0\``,
      color: 0x6366f1,
      footer: { text: `ID du Giveaway : ${giveawayId.toString()}` },
      timestamp: new Date().toISOString()
    }

    const actionRow = {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: `giveaway_join_${giveawayId.toString()}`,
          label: "Participer (0)",
          emoji: { name: "🎉" },
          style: 1 // Primary
        }
      ]
    }

    // Envoi du message avec le bouton interactif sur Discord
    const discordRes = await axios.post(
      `https://discord.com/api/channels/${channelId}/messages`,
      { embeds: [embed], components: [actionRow] },
      { headers: { Authorization: `Bot ${token}` } }
    )

    const messageId = discordRes.data?.id || null

    const db = await getDb()
    const newDoc = {
      _id: giveawayId,
      guildId,
      channelId,
      messageId,
      endTime,
      prize: prize.trim(),
      winnersCount: winners,
      participants: [],
      winners: [],
      hostedBy: req.user?.id || null,
      isEnded: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection("Giveaways").insertOne(newDoc)

    return res.status(201).json({
      success: true,
      giveaway: {
        id: giveawayId.toString(),
        ...newDoc
      }
    })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/giveaways error:", err?.response?.data || err?.message)
    return res.status(err?.response?.status || 500).json({
      error: err?.response?.data?.message || "Impossible de créer le giveaway sur Discord"
    })
  }
})

// 3. Clôturer un giveaway et tirer les gagnants
router.post("/guilds/:guildId/giveaways/:id/end", authenticate, async (req, res) => {
  const { guildId, id } = req.params
  const token = getBotToken()

  try {
    const db = await getDb()
    let queryId = id
    try {
      queryId = new ObjectId(id)
    } catch {}

    const giveaway = await db.collection("Giveaways").findOne({
      $or: [{ _id: queryId }, { _id: id }],
      guildId
    })

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway introuvable" })
    }

    if (giveaway.isEnded) {
      return res.status(400).json({ error: "Ce giveaway est déjà terminé" })
    }

    // Tirer au sort les gagnants
    const participants = [...(giveaway.participants || [])]
    const winners = []
    const pool = [...participants]
    const countToPick = Math.min(giveaway.winnersCount || 1, pool.length)

    while (winners.length < countToPick && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length)
      winners.push(pool.splice(idx, 1)[0])
    }

    // Mettre à jour en BDD
    await db.collection("Giveaways").updateOne(
      { _id: giveaway._id },
      {
        $set: {
          isEnded: true,
          winners,
          updatedAt: new Date()
        }
      }
    )

    // Mettre à jour Discord si bot token présent
    if (token && giveaway.channelId) {
      const winnersMentions =
        winners.length > 0
          ? winners.map((wid) => `<@${wid}>`).join(", ")
          : "*Aucun participant éligible*"

      const endEmbed = {
        title: `🎉 GIVEAWAY : ${giveaway.prize}`,
        description:
          `Ce giveaway est maintenant **terminé** !\n\n` +
          `🎁 **Lot gagné :** **${giveaway.prize}**\n` +
          `🏆 **Gagnant(s) :** ${winnersMentions}\n` +
          (giveaway.hostedBy ? `👤 **Organisé par :** <@${giveaway.hostedBy}>\n` : "") +
          `👥 **Total participants :** \`${participants.length}\``,
        color: 0x64748b,
        footer: { text: `Giveaway Terminé • ID : ${giveaway._id.toString()}` },
        timestamp: new Date().toISOString()
      }

      const disabledRow = {
        type: 1,
        components: [
          {
            type: 2,
            custom_id: `giveaway_ended_${giveaway._id.toString()}`,
            label: `Terminé (${participants.length} participants)`,
            emoji: { name: "🔒" },
            style: 2, // Secondary
            disabled: true
          }
        ]
      }

      if (giveaway.messageId) {
        await axios.patch(
          `https://discord.com/api/channels/${giveaway.channelId}/messages/${giveaway.messageId}`,
          { embeds: [endEmbed], components: [disabledRow] },
          { headers: { Authorization: `Bot ${token}` } }
        ).catch(() => {})
      }

      // Annonce gagnant(s)
      if (winners.length > 0) {
        await axios.post(
          `https://discord.com/api/channels/${giveaway.channelId}/messages`,
          {
            content: `🎉 Félicitations ${winnersMentions} ! Vous avez gagné le giveaway pour **${giveaway.prize}** ! 🎁`
          },
          { headers: { Authorization: `Bot ${token}` } }
        ).catch(() => {})
      } else {
        await axios.post(
          `https://discord.com/api/channels/${giveaway.channelId}/messages`,
          {
            content: `😕 Aucun gagnant pour le giveaway **${giveaway.prize}** (aucun participant).`
          },
          { headers: { Authorization: `Bot ${token}` } }
        ).catch(() => {})
      }
    }

    return res.json({ success: true, winners, isEnded: true })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/giveaways/:id/end error:", err)
    return res.status(500).json({ error: "Impossible de terminer le giveaway" })
  }
})

// 4. Reroll (relancer le tirage au sort)
router.post("/guilds/:guildId/giveaways/:id/reroll", authenticate, async (req, res) => {
  const { guildId, id } = req.params
  const token = getBotToken()

  try {
    const db = await getDb()
    let queryId = id
    try {
      queryId = new ObjectId(id)
    } catch {}

    const giveaway = await db.collection("Giveaways").findOne({
      $or: [{ _id: queryId }, { _id: id }],
      guildId
    })

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway introuvable" })
    }

    const participants = [...(giveaway.participants || [])]
    if (participants.length === 0) {
      return res.status(400).json({ error: "Aucun participant éligible pour relancer le tirage" })
    }

    const winners = []
    const pool = [...participants]
    const countToPick = Math.min(giveaway.winnersCount || 1, pool.length)

    while (winners.length < countToPick && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length)
      winners.push(pool.splice(idx, 1)[0])
    }

    await db.collection("Giveaways").updateOne(
      { _id: giveaway._id },
      {
        $set: {
          winners,
          isEnded: true,
          updatedAt: new Date()
        }
      }
    )

    if (token && giveaway.channelId) {
      const mentions = winners.map((wid) => `<@${wid}>`).join(", ")
      await axios.post(
        `https://discord.com/api/channels/${giveaway.channelId}/messages`,
        {
          content: `🔄 **Nouveau tirage (Reroll)** pour le giveaway **${giveaway.prize}** !\nFélicitations à ${mentions} ! 🎁`
        },
        { headers: { Authorization: `Bot ${token}` } }
      ).catch(() => {})
    }

    return res.json({ success: true, winners })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/giveaways/:id/reroll error:", err)
    return res.status(500).json({ error: "Impossible de relancer le tirage" })
  }
})

// 5. Supprimer un giveaway
router.delete("/guilds/:guildId/giveaways/:id", authenticate, async (req, res) => {
  const { guildId, id } = req.params
  try {
    const db = await getDb()
    let queryId = id
    try {
      queryId = new ObjectId(id)
    } catch {}

    await db.collection("Giveaways").deleteOne({
      $or: [{ _id: queryId }, { _id: id }],
      guildId
    })

    return res.json({ success: true, id })
  } catch (err) {
    console.error("DELETE /api/guilds/:guildId/giveaways/:id error:", err)
    return res.status(500).json({ error: "Impossible de supprimer le giveaway" })
  }
})

// ==========================================
// MODULE 6 : VERSIONING & DIFFUSION GLOBALE
// ==========================================
router.get("/version", async (_req, res) => {
  let latestGitHub = null
  try {
    const ghRes = await axios.get("https://api.github.com/repos/Scorpion-g/Sparcky/releases/latest", {
      headers: { "User-Agent": "Sparcky-Bot" }
    })
    if (ghRes.data) {
      latestGitHub = {
        tag: ghRes.data.tag_name,
        name: ghRes.data.name,
        url: ghRes.data.html_url,
        publishedAt: ghRes.data.published_at
      }
    }
  } catch {
    // Si aucune release publiée sur GitHub pour l'instant, fallback local
  }

  return res.json({
    version: CURRENT_VERSION,
    githubRepo: GITHUB_REPO,
    githubUrl: getGitHubReleaseUrl(),
    githubRelease: latestGitHub,
    changelog: getChangelog()
  })
})

router.post("/admin/broadcast-update", authenticate, async (req, res) => {
  const BOT_OWNER_IDS = ["857574003162349588", "313768826477150218"]
  if (process.env.OWNER_ID) BOT_OWNER_IDS.push(process.env.OWNER_ID)

  if (!BOT_OWNER_IDS.includes(req.user?.id)) {
    return res.status(403).json({ error: "Accès refusé : réservé aux propriétaires du bot." })
  }

  const {
    version = CURRENT_VERSION,
    force = false,
    title: customTitle,
    summary: customSummary,
    highlights: customHighlights,
    demoUrl = "https://sparcky.matteoriviere.fr/demo",
    panelUrl = "https://sparcky.matteoriviere.fr",
    githubUrl: customGithubUrl,
    testGuildId = null,
  } = req.body || {}

  const token = getBotToken()
  if (!token) return res.status(500).json({ error: "DISCORD_BOT_TOKEN manquant" })

  try {
    const db = await getDb()

    // 1. Récupérer toutes les guildes où le bot est connecté
    const botGuildsRes = await axios.get("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bot ${token}` }
    })
    let guilds = botGuildsRes.data || []

    if (testGuildId) {
      guilds = guilds.filter(g => g.id === testGuildId)
      if (guilds.length === 0) {
        return res.status(404).json({ error: "Le bot n'a pas été trouvé sur le serveur de test sélectionné." })
      }
    }

    const release = getChangelog(version)
    const finalTitle = customTitle || release.title
    const finalSummary = customSummary || release.summary
    const finalGithub = customGithubUrl || release.githubUrl || getGitHubReleaseUrl(release.version)
    const finalHighlights = Array.isArray(customHighlights) && customHighlights.length > 0
      ? customHighlights
      : release.highlights

    const embed = {
      title: `📢 ${finalTitle}`,
      description: `${finalSummary}\n\n**🌐 Panel Web :** [${panelUrl.replace(/^https?:\/\//, '')}](${panelUrl})\n**🎮 Sandbox Démo :** [${demoUrl.replace(/^https?:\/\//, '')}](${demoUrl})\n**📦 GitHub Release :** [Scorpion-g/Sparcky (v${release.version})](${finalGithub})\n\n──────────────────────────────`,
      color: 0x6366f1,
      fields: finalHighlights.map(h => ({
        name: `${h.emoji || "✨"} ${h.title}`,
        value: h.desc,
        inline: h.inline !== undefined ? Boolean(h.inline) : true
      })),
      footer: {
        text: `God_Sparky v${release.version} • GitHub: Scorpion-g/Sparcky`
      },
      timestamp: new Date().toISOString()
    }

    const results = {
      version,
      isTest: Boolean(testGuildId),
      totalGuilds: guilds.length,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      details: []
    }

    for (const g of guilds) {
      try {
        const guildConfig = await db.collection("guildconfigurations").findOne({ guildId: g.id })

        if (!testGuildId && !force && guildConfig?.lastAnnouncedVersion === version) {
          results.skippedCount++
          results.details.push({ guildId: g.id, guildName: g.name, status: "skipped", reason: `Déjà diffusé (v${version})` })
          continue
        }

        // Récupérer les salons de la guilde
        const chRes = await axios.get(`https://discord.com/api/guilds/${g.id}/channels`, {
          headers: { Authorization: `Bot ${token}` }
        })
        const channels = Array.isArray(chRes.data) ? chRes.data : []

        // Trouver le meilleur salon
        let targetChannel = null
        if (guildConfig?.announcementChannel) {
          targetChannel = channels.find(c => c.id === guildConfig.announcementChannel && c.type === 0)
        }

        if (!targetChannel) {
          const preferredNames = ["annonces", "annonce", "news", "mises-a-jour", "general", "général", "discussion", "chat"]
          targetChannel = channels.find(c => c.type === 0 && preferredNames.some(p => c.name?.toLowerCase().includes(p)))
        }

        if (!targetChannel) {
          const blacklisted = ["ticket", "log", "mod", "admin", "staff", "cmd", "bot-test"]
          targetChannel = channels.find(c => c.type === 0 && !blacklisted.some(b => c.name?.toLowerCase().includes(b)))
        }

        if (!targetChannel) {
          targetChannel = channels.find(c => c.type === 0)
        }

        if (!targetChannel) {
          results.failedCount++
          results.details.push({ guildId: g.id, guildName: g.name, status: "failed", reason: "Aucun salon textuel trouvé" })
          continue
        }

        await axios.post(
          `https://discord.com/api/channels/${targetChannel.id}/messages`,
          { embeds: [embed] },
          { headers: { Authorization: `Bot ${token}` } }
        )

        if (!testGuildId) {
          await db.collection("guildconfigurations").updateOne(
            { guildId: g.id },
            { $set: { lastAnnouncedVersion: version, updatedAt: new Date() } },
            { upsert: true }
          )
        }

        results.sentCount++
        results.details.push({
          guildId: g.id,
          guildName: g.name,
          channelId: targetChannel.id,
          channelName: targetChannel.name,
          status: "sent"
        })
      } catch (gErr) {
        results.failedCount++
        results.details.push({ guildId: g.id, guildName: g.name, status: "failed", reason: gErr?.response?.data?.message || gErr.message })
      }
    }

    return res.json({ success: true, ...results })
  } catch (err) {
    console.error("POST /api/admin/broadcast-update error:", err)
    return res.status(500).json({ error: "Échec de la diffusion globale" })
  }
})

// ==========================================
// MODULE 7 : GITHUB WEBHOOK (AUTO BROADCAST SUR RELEASE)
// ==========================================
router.post("/webhooks/github", async (req, res) => {
  const event = req.headers["x-github-event"]
  const payload = req.body || {}

  if (event === "ping") {
    return res.json({ msg: "GitHub Webhook connecté avec succès !" })
  }

  if (event === "release" && payload.action === "published") {
    const release = payload.release
    const tagName = release?.tag_name || "v2.0.0"
    const releaseTitle = release?.name || `Mise à jour ${tagName}`
    const releaseBody = release?.body || ""

    console.log(`[GitHub Webhook] Nouvelle release officielle publiée : ${tagName} (${releaseTitle})`)

    const token = getBotToken()
    if (token) {
      try {
        const db = await getDb()
        const botGuildsRes = await axios.get("https://discord.com/api/users/@me/guilds", {
          headers: { Authorization: `Bot ${token}` }
        })
        const guilds = botGuildsRes.data || []

        const embed = {
          title: `📢 ${releaseTitle}`,
          description: `${releaseBody ? releaseBody.slice(0, 500) + "...\n\n" : ""}` +
            `**🌐 Panel Web :** [sparcky.matteoriviere.fr](https://sparcky.matteoriviere.fr)\n` +
            `**📦 GitHub Release :** [Scorpion-g/Sparcky (${tagName})](${release?.html_url || getGitHubReleaseUrl(tagName)})\n\n` +
            `──────────────────────────────`,
          color: 0x6366f1,
          footer: { text: `God_Sparky ${tagName} • Publication GitHub Automatisée` },
          timestamp: new Date().toISOString()
        }

        for (const g of guilds) {
          try {
            const guildConfig = await db.collection("guildconfigurations").findOne({ guildId: g.id })
            if (guildConfig?.lastAnnouncedVersion === tagName) continue

            const chRes = await axios.get(`https://discord.com/api/guilds/${g.id}/channels`, {
              headers: { Authorization: `Bot ${token}` }
            })
            const channels = Array.isArray(chRes.data) ? chRes.data : []
            let targetChannel = guildConfig?.announcementChannel ? channels.find(c => c.id === guildConfig.announcementChannel && c.type === 0) : null
            if (!targetChannel) targetChannel = channels.find(c => c.type === 0 && ["annonces", "annonce", "news", "general"].some(p => c.name?.toLowerCase().includes(p)))
            if (!targetChannel) targetChannel = channels.find(c => c.type === 0)
            if (!targetChannel) continue

            await axios.post(
              `https://discord.com/api/channels/${targetChannel.id}/messages`,
              { embeds: [embed] },
              { headers: { Authorization: `Bot ${token}` } }
            )

            await db.collection("guildconfigurations").updateOne(
              { guildId: g.id },
              { $set: { lastAnnouncedVersion: tagName, updatedAt: new Date() } },
              { upsert: true }
            )
          } catch (gErr) {
            console.error(`[GitHub Webhook] Échec diffusion sur guilde ${g.id}:`, gErr?.message)
          }
        }
      } catch (e) {
        console.error("[GitHub Webhook] Erreur lors de la diffusion automatique:", e?.message)
      }
    }
  }

  return res.json({ received: true })
})

export default router
