import axios from "axios"

// Cache en mémoire pour éviter le spam de l'API Discord et respecter les rate-limits
const userCache = new Map() // userId -> { id, username, rawUsername, avatar, bot, timestamp }
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes de mise en cache

/**
 * Résout les informations d'un utilisateur Discord par son identifiant
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<{ id: string, username: string, avatar: string|null, bot: boolean }>}
 */
export async function resolveDiscordUser(userId, token) {
  if (!userId || userId === "system" || userId === "unknown") {
    return { id: userId, username: "Système", avatar: null, bot: false }
  }

  const cached = userCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached
  }

  if (!token) {
    return { id: userId, username: `Utilisateur (${userId.slice(-4)})`, avatar: null, bot: false }
  }

  try {
    const res = await axios.get(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
      timeout: 3000
    })
    const u = res.data
    const resolved = {
      id: u.id,
      username: u.global_name || u.username,
      rawUsername: u.username,
      avatar: u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 5n)}.png`,
      bot: Boolean(u.bot),
      timestamp: Date.now()
    }
    userCache.set(userId, resolved)
    return resolved
  } catch {
    const fallback = {
      id: userId,
      username: `Utilisateur (${userId.slice(-4)})`,
      avatar: null,
      bot: false,
      timestamp: Date.now()
    }
    userCache.set(userId, fallback)
    return fallback
  }
}

/**
 * Génère l'URL d'avatar Discord ou l'avatar par défaut
 */
export function discordAvatarUrl(user) {
  if (!user || !user.id) return null
  if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`
  if (String(user.avatar).startsWith("http")) return user.avatar
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
}
