import express from "express"
import { authenticate } from "../middlewares/auth.js"
import { getDb } from "../lib/mongo.js"
import { getGuildConfig } from "../lib/guildConfigRepo.js"
import { randomUUID } from "node:crypto"
import axios from "axios"

const router = express.Router()

function getBotToken() {
  return process.env.DISCORD_BOT_TOKEN
}

// Cache pour les profils Discord utilisateurs
const userProfileCache = new Map()

async function fetchDiscordUser(userId) {
  if (userProfileCache.has(userId)) {
    const cached = userProfileCache.get(userId)
    if (Date.now() < cached.expiresAt) return cached.data
  }

  const token = getBotToken()
  if (!token) return { id: userId, username: `Utilisateur ${userId.slice(0, 4)}`, avatarUrl: null }

  try {
    const res = await axios.get(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${token}` }
    })
    const data = {
      id: res.data.id,
      username: res.data.global_name || res.data.username,
      avatarUrl: res.data.avatar
        ? `https://cdn.discordapp.com/avatars/${res.data.id}/${res.data.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/0.png`
    }
    userProfileCache.set(userId, { data, expiresAt: Date.now() + 10 * 60 * 1000 })
    return data
  } catch {
    return { id: userId, username: `Utilisateur ${userId.slice(0, 4)}`, avatarUrl: null }
  }
}

// ==========================================
// 1. ECONOMIE & CLASSEMENT
// ==========================================
router.get("/guilds/:guildId/economy", authenticate, async (req, res) => {
  const { guildId } = req.params

  try {
    const db = await getDb()
    const config = await getGuildConfig(guildId)

    // Top 25 utilisateurs les plus riches
    const topUsers = await db
      .collection("users")
      .find({ guildId })
      .sort({ balance: -1 })
      .limit(25)
      .toArray()

    const enrichedLeaderboard = await Promise.all(
      topUsers.map(async (u, idx) => {
        const profile = await fetchDiscordUser(u.userId)
        return {
          rank: idx + 1,
          userId: u.userId,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          balance: u.balance || 0,
          itemsCount: Array.isArray(u.items) ? u.items.length : 0,
          lastDaily: u.lastDaily || null
        }
      })
    )

    return res.json({
      guildId,
      economy: {
        currencySymbol: config.currencySymbol || "$",
        currencyName: config.currencyName || "Coins",
        dailyAmount: config.dailyAmount ?? 500,
        workMin: config.workMin ?? 50,
        workMax: config.workMax ?? 250,
        chatReward: config.chatReward ?? 0,
        robEnabled: Boolean(config.robEnabled)
      },
      leaderboard: enrichedLeaderboard
    })
  } catch (err) {
    console.error("GET /api/guilds/:guildId/economy error:", err)
    return res.status(500).json({ error: "Impossible de charger les données économiques" })
  }
})

// Ajustement administratif du solde d'un utilisateur
router.post("/guilds/:guildId/economy/balance", authenticate, async (req, res) => {
  const { guildId } = req.params
  const { userId, amount, action = "set" } = req.body || {}

  if (!userId || typeof amount !== "number") {
    return res.status(400).json({ error: "userId et amount requis" })
  }

  try {
    const db = await getDb()
    const usersCol = db.collection("users")

    const user = await usersCol.findOne({ guildId, userId })
    let newBalance = amount

    if (user) {
      if (action === "add") newBalance = Math.max(0, (user.balance || 0) + amount)
      else if (action === "remove") newBalance = Math.max(0, (user.balance || 0) - amount)
      else newBalance = Math.max(0, amount)

      await usersCol.updateOne(
        { guildId, userId },
        { $set: { balance: newBalance, updatedAt: new Date() } }
      )
    } else {
      newBalance = Math.max(0, amount)
      await usersCol.insertOne({
        guildId,
        userId,
        balance: newBalance,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    return res.json({ success: true, guildId, userId, balance: newBalance })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/economy/balance error:", err)
    return res.status(500).json({ error: "Impossible d'ajuster le solde" })
  }
})

// ==========================================
// 2. BOUTIQUE (SHOP MANAGER)
// ==========================================
router.get("/guilds/:guildId/shop", authenticate, async (req, res) => {
  const { guildId } = req.params

  try {
    const db = await getDb()
    const items = await db
      .collection("shopitems")
      .find({ guildId })
      .sort({ price: 1 })
      .toArray()

    return res.json({ guildId, items })
  } catch (err) {
    console.error("GET /api/guilds/:guildId/shop error:", err)
    return res.status(500).json({ error: "Impossible de charger la boutique" })
  }
})

// Ajouter un article à la boutique
router.post("/guilds/:guildId/shop", authenticate, async (req, res) => {
  const { guildId } = req.params
  const { name, description = "", price, stock = -1, type = "item", roleId = null } = req.body || {}

  if (!name || typeof price !== "number") {
    return res.status(400).json({ error: "Nom et prix obligatoires" })
  }

  try {
    const db = await getDb()
    const shopCol = db.collection("shopitems")

    const existing = await shopCol.findOne({ guildId, name: name.trim() })
    if (existing) {
      return res.status(400).json({ error: "Un article portant ce nom existe déjà" })
    }

    const newItem = {
      itemId: randomUUID(),
      guildId,
      name: name.trim(),
      description: String(description).trim(),
      price: Math.max(0, Math.floor(price)),
      stock: typeof stock === "number" ? stock : -1,
      type: ["role", "item", "other"].includes(type) ? type : "item",
      roleId: type === "role" && roleId ? String(roleId) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await shopCol.insertOne(newItem)
    return res.json({ success: true, item: newItem })
  } catch (err) {
    console.error("POST /api/guilds/:guildId/shop error:", err)
    return res.status(500).json({ error: "Impossible de créer l'article" })
  }
})

// Modifier un article de la boutique
router.put("/guilds/:guildId/shop/:itemId", authenticate, async (req, res) => {
  const { guildId, itemId } = req.params
  const { name, description, price, stock, type, roleId } = req.body || {}

  try {
    const db = await getDb()
    const shopCol = db.collection("shopitems")

    const existing = await shopCol.findOne({ guildId, itemId })
    if (!existing) {
      return res.status(404).json({ error: "Article introuvable" })
    }

    const updates = { updatedAt: new Date() }
    if (name) updates.name = String(name).trim()
    if (description !== undefined) updates.description = String(description).trim()
    if (typeof price === "number") updates.price = Math.max(0, Math.floor(price))
    if (typeof stock === "number") updates.stock = stock
    if (type && ["role", "item", "other"].includes(type)) updates.type = type
    if (roleId !== undefined) updates.roleId = roleId || null

    await shopCol.updateOne({ guildId, itemId }, { $set: updates })
    return res.json({ success: true, item: { ...existing, ...updates } })
  } catch (err) {
    console.error("PUT /api/guilds/:guildId/shop/:itemId error:", err)
    return res.status(500).json({ error: "Impossible de mettre à jour l'article" })
  }
})

// Supprimer un article de la boutique
router.delete("/guilds/:guildId/shop/:itemId", authenticate, async (req, res) => {
  const { guildId, itemId } = req.params

  try {
    const db = await getDb()
    const result = await db.collection("shopitems").deleteOne({ guildId, itemId })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Article introuvable" })
    }

    return res.json({ success: true, itemId })
  } catch (err) {
    console.error("DELETE /api/guilds/:guildId/shop/:itemId error:", err)
    return res.status(500).json({ error: "Impossible de supprimer l'article" })
  }
})

// ==========================================
// 3. NIVEAUX & XP (CLASSEMENT)
// ==========================================
router.get("/guilds/:guildId/levels", authenticate, async (req, res) => {
  const { guildId } = req.params

  try {
    const db = await getDb()
    const topLevels = await db
      .collection("Level")
      .find({ guildId })
      .sort({ level: -1, xp: -1 })
      .limit(30)
      .toArray()

    const enriched = await Promise.all(
      topLevels.map(async (lvl, idx) => {
        const profile = await fetchDiscordUser(lvl.userId)
        return {
          rank: idx + 1,
          userId: lvl.userId,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          level: lvl.level || 0,
          xp: lvl.xp || 0
        }
      })
    )

    return res.json({ guildId, leaderboard: enriched })
  } catch (err) {
    console.error("GET /api/guilds/:guildId/levels error:", err)
    return res.status(500).json({ error: "Impossible de charger le classement des niveaux" })
  }
})

export default router
