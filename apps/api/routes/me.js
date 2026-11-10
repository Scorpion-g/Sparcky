import express from "express"
import { authenticate } from "../middlewares/auth.js"
import axios from "axios"

const router = express.Router()

// Cache en mémoire pour éviter le rate-limit Discord
const meCache = new Map()
const CACHE_TTL_MS = Number.parseInt(process.env.ME_CACHE_TTL_MS || "15000", 10)

let cachedBotInfo = null
let cachedBotInfoExpiresAt = 0

let cachedBotGuilds = null
let cachedBotGuildsExpiresAt = 0

function discordUserAvatarUrl({ id, avatar }, { size = 128 } = {}) {
  if (!id) return null
  if (!avatar) return `https://cdn.discordapp.com/embed/avatars/0.png?size=${size}`
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=${size}`
}

function discordGuildIconUrl({ id, icon }, { size = 128 } = {}) {
  if (!id || !icon) return null
  return `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=${size}`
}

// Récupère les infos réelles du bot depuis Discord
async function getBotInfo() {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return null

  if (cachedBotInfo && Date.now() < cachedBotInfoExpiresAt) {
    return cachedBotInfo
  }

  try {
    const res = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bot ${token}` }
    })
    const data = res.data
    cachedBotInfo = {
      id: data.id,
      username: data.username,
      discriminator: data.discriminator,
      avatar: data.avatar,
      avatarUrl: discordUserAvatarUrl({ id: data.id, avatar: data.avatar }, { size: 256 })
    }
    cachedBotInfoExpiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
    return cachedBotInfo
  } catch (err) {
    console.error("Erreur récupération infos bot Discord:", err?.message)
    return {
      id: process.env.DISCORD_BOT_ID || process.env.DISCORD_CLIENT_ID,
      username: "God_Sparky",
      avatarUrl: null
    }
  }
}

// Récupère les IDs des serveurs où le bot est présent
async function getBotGuildIds() {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return new Set()

  if (cachedBotGuilds && Date.now() < cachedBotGuildsExpiresAt) {
    return cachedBotGuilds
  }

  try {
    const res = await axios.get("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bot ${token}` }
    })
    const guildIds = new Set(Array.isArray(res.data) ? res.data.map(g => g.id) : [])
    cachedBotGuilds = guildIds
    cachedBotGuildsExpiresAt = Date.now() + 30 * 1000 // 30 secondes
    return guildIds
  } catch (err) {
    console.error("Erreur récupération serveurs bot Discord:", err?.message)
    return cachedBotGuilds || new Set()
  }
}

const DISCORD_PERM_ADMINISTRATOR = 1n << 3n
const DISCORD_PERM_MANAGE_GUILD = 1n << 5n

function checkAdmin(guild) {
  if (guild.owner) return true
  try {
    const perms = BigInt(guild?.permissions ?? "0")
    return (perms & DISCORD_PERM_ADMINISTRATOR) === DISCORD_PERM_ADMINISTRATOR ||
           (perms & DISCORD_PERM_MANAGE_GUILD) === DISCORD_PERM_MANAGE_GUILD
  } catch {
    return false
  }
}

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = req.user
    if (!user?.access_token) {
      return res.status(401).json({ error: "Missing Discord access token" })
    }

    const cached = meCache.get(user.id)
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.payload)
    }

    // Récupérer en parallèle les infos bot, les serveurs bot, et les serveurs utilisateur
    const [botInfo, botGuildIds, guildsRes] = await Promise.all([
      getBotInfo(),
      getBotGuildIds(),
      axios.get("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${user.access_token}` }
      })
    ])

    const BOT_OWNER_IDS = ["857574003162349588", "313768826477150218"]
    if (process.env.OWNER_ID) BOT_OWNER_IDS.push(process.env.OWNER_ID)

    const enrichedUser = {
      ...user,
      isBotOwner: BOT_OWNER_IDS.includes(user.id),
      avatarUrl: discordUserAvatarUrl({ id: user.id, avatar: user.avatar }, { size: 128 })
    }

    const enrichedGuilds = Array.isArray(guildsRes.data)
      ? guildsRes.data.map(g => {
          const isAdmin = checkAdmin(g)
          const botInGuild = botGuildIds.has(g.id)
          const clientId = botInfo?.id || process.env.DISCORD_CLIENT_ID
          const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${g.id}&disable_guild_select=true`

          return {
            id: g.id,
            name: g.name,
            icon: g.icon,
            iconUrl: discordGuildIconUrl({ id: g.id, icon: g.icon }, { size: 128 }),
            owner: Boolean(g.owner),
            permissions: g.permissions,
            isAdmin,
            botInGuild,
            inviteUrl
          }
        })
      : []

    const payload = {
      user: enrichedUser,
      bot: botInfo,
      guilds: enrichedGuilds
    }

    meCache.set(user.id, { expiresAt: Date.now() + CACHE_TTL_MS, payload })
    return res.json(payload)
  } catch (err) {
    const status = err?.response?.status
    const data = err?.response?.data

    if (status === 401 || status === 403) {
      return res.status(401).json({ error: "Session Discord expirée, veuillez vous reconnecter." })
    }

    console.error("/api/me error", { status, message: err?.message, data })
    return res.status(500).json({ error: "Erreur lors du chargement de vos serveurs." })
  }
})

export default router
