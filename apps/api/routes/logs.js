import express from "express"
import { authenticate } from "../middlewares/auth.js"
import axios from "axios"
import { getGuildConfig } from "../lib/guildConfigRepo.js"
import { getDb } from "../lib/mongo.js"
import { resolveDiscordUser, discordAvatarUrl } from "../lib/discordResolver.js"

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

// Map Discord audit log action types to readable names & categories (spécification officielle Discord)
const AUDIT_ACTION_MAP = {
  1: { action: "Serveur mis à jour", category: "general", badge: "info" },
  10: { action: "Salon créé", category: "channels", badge: "success" },
  11: { action: "Salon modifié", category: "channels", badge: "info" },
  12: { action: "Salon supprimé", category: "channels", badge: "danger" },
  13: { action: "Permissions salon créées", category: "channels", badge: "info" },
  14: { action: "Permissions salon modifiées", category: "channels", badge: "info" },
  15: { action: "Permissions salon supprimées", category: "channels", badge: "danger" },
  20: { action: "Membre expulsé (Kick)", category: "moderation", badge: "warning" },
  21: { action: "Membres inactifs purgés", category: "moderation", badge: "warning" },
  22: { action: "Membre banni (Ban)", category: "moderation", badge: "danger" },
  23: { action: "Bannissement révoqué (Unban)", category: "moderation", badge: "success" },
  24: { action: "Membre mis à jour (Timeout / Pseudo)", category: "moderation", badge: "warning" },
  25: { action: "Rôles du membre modifiés", category: "roles", badge: "info" },
  26: { action: "Membre déplacé (Vocal)", category: "general", badge: "info" },
  27: { action: "Membre déconnecté (Vocal)", category: "moderation", badge: "warning" },
  28: { action: "Bot ajouté", category: "general", badge: "info" },
  30: { action: "Rôle créé", category: "roles", badge: "success" },
  31: { action: "Rôle modifié", category: "roles", badge: "info" },
  32: { action: "Rôle supprimé", category: "roles", badge: "danger" },
  40: { action: "Invitation créée", category: "general", badge: "info" },
  41: { action: "Invitation modifiée", category: "general", badge: "info" },
  42: { action: "Invitation supprimée", category: "general", badge: "warning" },
  50: { action: "Webhook créé", category: "general", badge: "info" },
  51: { action: "Webhook modifié", category: "general", badge: "info" },
  52: { action: "Webhook supprimé", category: "general", badge: "danger" },
  60: { action: "Emoji créé", category: "general", badge: "info" },
  61: { action: "Emoji modifié", category: "general", badge: "info" },
  62: { action: "Emoji supprimé", category: "general", badge: "danger" },
  72: { action: "Message supprimé", category: "messages", badge: "warning" },
  73: { action: "Messages supprimés en masse", category: "messages", badge: "danger" },
  74: { action: "Message épinglé", category: "messages", badge: "info" },
  75: { action: "Message désépinglé", category: "messages", badge: "info" },
  80: { action: "Intégration ajoutée", category: "general", badge: "info" },
  81: { action: "Intégration modifiée", category: "general", badge: "info" },
  82: { action: "Intégration supprimée", category: "general", badge: "danger" },
  140: { action: "Règle AutoMod créée", category: "moderation", badge: "info" },
  141: { action: "Règle AutoMod modifiée", category: "moderation", badge: "info" },
  142: { action: "Règle AutoMod supprimée", category: "moderation", badge: "danger" },
  143: { action: "Message bloqué par AutoMod", category: "moderation", badge: "danger" },
  145: { action: "AutoMod Timeout", category: "moderation", badge: "danger" }
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
          username: m.author.global_name || m.author.username,
          avatar: discordAvatarUrl(m.author)
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
    const [auditRes, rolesRes, channelsRes] = await Promise.all([
      axios.get(`https://discord.com/api/v10/guilds/${guildId}/audit-logs`, {
        headers: { Authorization: `Bot ${botToken}` },
        params: { limit }
      }).catch(err => {
        if (err?.response?.status === 403) hasAuditPermission = false
        return null
      }),
      axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` }
      }).catch(() => null),
      axios.get(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}` }
      }).catch(() => null)
    ])

    const rolesMap = new Map()
    if (Array.isArray(rolesRes?.data)) {
      for (const r of rolesRes.data) {
        rolesMap.set(r.id, `@${r.name}`)
      }
    }

    const channelsMap = new Map()
    if (Array.isArray(channelsRes?.data)) {
      for (const c of channelsRes.data) {
        channelsMap.set(c.id, `#${c.name}`)
      }
    }

    if (auditRes?.data && Array.isArray(auditRes.data.audit_log_entries)) {
      hasAuditPermission = true
      const usersMap = new Map()
      if (Array.isArray(auditRes.data.users)) {
        for (const u of auditRes.data.users) {
          usersMap.set(u.id, u)
        }
      }

      for (const entry of auditRes.data.audit_log_entries) {
        const meta = AUDIT_ACTION_MAP[entry.action_type] || {
          action: `Action (${entry.action_type})`,
          category: "general",
          badge: "info"
        }

        // Résolution de l'exécuteur (auteur de l'action)
        let executorObj = null
        if (usersMap.has(entry.user_id)) {
          const u = usersMap.get(entry.user_id)
          executorObj = {
            id: u.id,
            username: u.global_name || u.username,
            avatar: discordAvatarUrl(u),
            bot: Boolean(u.bot)
          }
        } else {
          const resolved = await resolveDiscordUser(entry.user_id, botToken)
          executorObj = {
            id: resolved.id,
            username: resolved.username,
            avatar: resolved.avatar,
            bot: resolved.bot
          }
        }

        // Résolution de la cible (cible de l'action) : utilisateur, rôle, salon, invitation, intégration
        let targetObj = null
        if (entry.target_id) {
          let targetName = null
          let targetAvatar = null

          if (usersMap.has(entry.target_id)) {
            const u = usersMap.get(entry.target_id)
            targetName = u.global_name || u.username
            targetAvatar = discordAvatarUrl(u)
          } else if (rolesMap.has(entry.target_id)) {
            targetName = rolesMap.get(entry.target_id)
          } else if (channelsMap.has(entry.target_id)) {
            targetName = channelsMap.get(entry.target_id)
          } else {
            // Examiner les modifications (changes)
            const nameChange = entry.changes?.find(c => c.key === "name")
            const codeChange = entry.changes?.find(c => c.key === "code")
            if (nameChange) {
              const val = nameChange.new_value || nameChange.old_value
              if (entry.action_type >= 10 && entry.action_type <= 15) targetName = `#${val}`
              else if (entry.action_type >= 30 && entry.action_type <= 32) targetName = `@${val}`
              else targetName = val
            } else if (codeChange) {
              targetName = `Invitation discord.gg/${codeChange.new_value || codeChange.old_value}`
            } else if (entry.action_type >= 20 && entry.action_type <= 28) {
              const resolved = await resolveDiscordUser(entry.target_id, botToken)
              targetName = resolved.username
              targetAvatar = resolved.avatar
            } else {
              targetName = `Élément (${entry.target_id.slice(-4)})`
            }
          }

          targetObj = {
            id: entry.target_id,
            username: targetName,
            avatar: targetAvatar
          }
        }

        events.push({
          id: entry.id,
          source: "audit_log",
          actionType: entry.action_type,
          action: meta.action,
          category: meta.category,
          badge: meta.badge,
          executor: executorObj,
          target: targetObj,
          reason: entry.reason || null,
          changes: entry.changes || [],
          timestamp: snowflakeToIso(entry.id)
        })
      }
    }
  } catch (err) {
    console.warn("Impossible de récupérer les audit logs Discord:", err?.message)
  }

  // 2. Récupération des Avertissements (Warns) récents en base de données
  try {
    const db = await getDb()
    const warnsCollection = db.collection("warns")
    const recentWarns = await warnsCollection
      .find({ guildId, warn: { $gt: 0 } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(30)
      .toArray()

    for (const w of recentWarns) {
      const targetUser = await resolveDiscordUser(w.userId, botToken)
      const modUser = w.moderatorId ? await resolveDiscordUser(w.moderatorId, botToken) : null

      const reasonStr = Array.isArray(w.raison) && w.raison.length > 0
        ? w.raison.join(", ")
        : (w.reason || "Aucun motif spécifié")

      events.push({
        id: `warn_${w._id}`,
        source: "warn",
        actionType: "WARN",
        action: `Avertissement (${w.warn} actif${w.warn > 1 ? "s" : ""})`,
        category: "moderation",
        badge: "warning",
        executor: {
          id: modUser?.id || "system",
          username: modUser?.username || "Système",
          avatar: modUser?.avatar || null,
          bot: false
        },
        target: {
          id: w.userId,
          username: targetUser.username,
          avatar: targetUser.avatar
        },
        reason: reasonStr,
        timestamp: w.updatedAt ? new Date(w.updatedAt).toISOString() : (w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString())
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
                  avatar: m.author.avatar,
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
    messages
  })
})

export default router
