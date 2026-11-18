import express from "express"
import { authenticate } from "../middlewares/auth.js"
import axios from "axios"
import { getGuildConfig } from "../lib/guildConfigRepo.js"
import { getDb } from "../lib/mongo.js"

const router = express.Router()

function getBotToken() {
  return process.env.DISCORD_BOT_TOKEN
}

function snowflakeToIso(id) {
  try {
    const epoch = 1420070400000n
    const timestamp = Number((BigInt(id) >> 22n) + epoch)
    return new Date(timestamp).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function discordAvatarUrl(user) {
  if (!user || !user.id) return null
  if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
}

// Map Discord audit log action types to readable names & categories
const AUDIT_ACTION_MAP = {
  1: { action: "Serveur mis à jour", category: "general", badge: "info" },
  10: { action: "Salon créé", category: "channels", badge: "success" },
  11: { action: "Salon modifié", category: "channels", badge: "info" },
  12: { action: "Salon supprimé", category: "channels", badge: "danger" },
  13: { action: "Permissions salon créées", category: "channels", badge: "info" },
  14: { action: "Permissions salon modifiées", category: "channels", badge: "info" },
  15: { action: "Permissions salon supprimées", category: "channels", badge: "danger" },
  20: { action: "Rôle créé", category: "roles", badge: "success" },
  21: { action: "Rôle modifié", category: "roles", badge: "info" },
  22: { action: "Rôle supprimé", category: "roles", badge: "danger" },
  24: { action: "Membre expulsé (Kick)", category: "moderation", badge: "warning" },
  25: { action: "Membres inactifs purgés", category: "moderation", badge: "warning" },
  26: { action: "Membre banni (Ban)", category: "moderation", badge: "danger" },
  27: { action: "Bannissement révoqué (Unban)", category: "moderation", badge: "success" },
  28: { action: "Membre modifié (Timeout / Pseudo)", category: "moderation", badge: "warning" },
  29: { action: "Rôles du membre modifiés", category: "roles", badge: "info" },
  30: { action: "Bot ajouté", category: "general", badge: "info" },
  72: { action: "Message supprimé", category: "messages", badge: "warning" },
  73: { action: "Messages supprimés en masse", category: "messages", badge: "danger" },
  74: { action: "Message épinglé", category: "messages", badge: "info" },
  75: { action: "Message désépinglé", category: "messages", badge: "info" },
  140: { action: "Règle AutoMod créée", category: "moderation", badge: "info" },
  141: { action: "Règle AutoMod modifiée", category: "moderation", badge: "info" },
  142: { action: "Règle AutoMod supprimée", category: "moderation", badge: "danger" },
  143: { action: "Message bloqué par AutoMod", category: "moderation", badge: "danger" }
}

function simplifyMessage(m) {
  return {
    id: m.id,
    channel_id: m.channel_id,
    timestamp: m.timestamp,
    content: m.content,
    author: m.author
      ? {
          id: m.author.id,
          username: m.author.username,
          global_name: m.author.global_name ?? null,
          avatar: m.author.avatar ?? null
        }
      : null
  }
}

router.get("/guilds/:guildId/logs", authenticate, async (req, res) => {
  const { guildId } = req.params
  const botToken = getBotToken()

  if (!botToken) {
    return res.status(500).json({ error: "Missing DISCORD_BOT_TOKEN" })
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)))
  const events = []
  let messages = []
  let hasAuditPermission = false
  const config = await getGuildConfig(guildId)

  // 1. Récupération des Audit Logs Discord officiels
  try {
    const auditRes = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/audit-logs`, {
      headers: { Authorization: `Bot ${botToken}` },
      params: { limit }
    })

    if (auditRes.data && Array.isArray(auditRes.data.audit_log_entries)) {
      hasAuditPermission = true
      const usersMap = new Map()
      if (Array.isArray(auditRes.data.users)) {
        for (const u of auditRes.data.users) {
          usersMap.set(u.id, u)
        }
      }

      for (const entry of auditRes.data.audit_log_entries) {
        const meta = AUDIT_ACTION_MAP[entry.action_type] || {
          action: `Action inconnue (${entry.action_type})`,
          category: "general",
          badge: "info"
        }

        const executorUser = usersMap.get(entry.user_id) || null
        const targetUser = entry.target_id ? usersMap.get(entry.target_id) : null

        events.push({
          id: entry.id,
          source: "audit_log",
          actionType: entry.action_type,
          action: meta.action,
          category: meta.category,
          badge: meta.badge,
          executor: executorUser
            ? {
                id: executorUser.id,
                username: executorUser.username,
                global_name: executorUser.global_name,
                avatar: discordAvatarUrl(executorUser),
                bot: Boolean(executorUser.bot)
              }
            : { id: entry.user_id, username: "Inconnu", avatar: null, bot: false },
          target: targetUser
            ? {
                id: targetUser.id,
                username: targetUser.username,
                avatar: discordAvatarUrl(targetUser)
              }
            : entry.target_id
            ? { id: entry.target_id }
            : null,
          reason: entry.reason || null,
          changes: entry.changes || [],
          timestamp: snowflakeToIso(entry.id)
        })
      }
    }
  } catch (err) {
    // Si permission manquante (403), on continue gracieusement
    if (err?.response?.status === 403) {
      hasAuditPermission = false
    } else {
      console.warn("Impossible de récupérer les audit logs Discord:", err?.message)
    }
  }

  // 2. Récupération des Avertissements (Warns) récents en base de données
  try {
    const db = await getDb()
    const warnsCollection = db.collection("warns")
    const recentWarns = await warnsCollection
      .find({ guildId })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray()

    for (const w of recentWarns) {
      events.push({
        id: `warn_${w._id}`,
        source: "warn",
        actionType: "WARN",
        action: "Avertissement (Warn)",
        category: "moderation",
        badge: "warning",
        executor: {
          id: w.moderatorId || "system",
          username: w.moderatorName || "Modérateur",
          avatar: null,
          bot: false
        },
        target: {
          id: w.userId,
          username: w.userName || `ID: ${w.userId}`,
          avatar: null
        },
        reason: w.reason || "Aucune raison spécifiée",
        timestamp: w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString()
      })
    }
  } catch (err) {
    console.warn("Erreur lecture warns pour logs:", err?.message)
  }

  // 3. Lecture des messages du salon de log si configuré
  const channelId = config?.modLogChannel
  if (channelId) {
    try {
      const messagesRes = await axios.get(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        headers: { Authorization: `Bot ${botToken}` },
        params: { limit: Math.min(limit, 30) }
      })

      if (Array.isArray(messagesRes.data)) {
        messages = messagesRes.data.map(simplifyMessage)

        for (const m of messages) {
          events.push({
            id: `msg_${m.id}`,
            source: "channel_log",
            actionType: "CHANNEL_MESSAGE",
            action: "Message de log",
            category: "moderation",
            badge: "info",
            executor: m.author
              ? {
                  id: m.author.id,
                  username: m.author.username,
                  global_name: m.author.global_name,
                  avatar: m.author.avatar ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64` : null,
                  bot: true
                }
              : { id: "unknown", username: "Bot", avatar: null, bot: true },
            target: null,
            reason: m.content || "(Embed de modération)",
            timestamp: m.timestamp
          })
        }
      }
    } catch {
      // Ignorer silencieusement si salon inaccessible
    }
  }

  // Trier tous les événements par date décroissante
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return res.json({
    guildId,
    channelId: channelId || null,
    hasAuditPermission,
    events,
    messages // Rétro-compatibilité
  })
})

export default router
