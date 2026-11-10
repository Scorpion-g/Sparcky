import express from "express"
import { authenticate } from "../middlewares/auth.js"
import { getDb } from "../lib/mongo.js"
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
  const { channelId, title, description, color = "#6366F1", image, thumbnail, footer } = req.body || {}

  if (!channelId || !description) {
    return res.status(400).json({ error: "channelId et description sont obligatoires" })
  }

  const token = getBotToken()
  if (!token) return res.status(500).json({ error: "DISCORD_BOT_TOKEN manquant" })

  try {
    // Parser la couleur hex en entier
    const hex = color.replace("#", "")
    const colorInt = Number.parseInt(hex, 16) || 0x6366f1

    const embed = {
      title: title ? String(title).slice(0, 256) : undefined,
      description: String(description).slice(0, 4096),
      color: colorInt,
      timestamp: new Date().toISOString()
    }

    if (image && image.startsWith("http")) embed.image = { url: image }
    if (thumbnail && thumbnail.startsWith("http")) embed.thumbnail = { url: thumbnail }
    if (footer) embed.footer = { text: String(footer).slice(0, 2048) }

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

export default router
