import express from "express"
import { authenticate } from "../middlewares/auth.js"
import { getDb } from "../lib/mongo.js"
import axios from "axios"

const router = express.Router()

function getBotToken() {
  return process.env.DISCORD_BOT_TOKEN
}

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
