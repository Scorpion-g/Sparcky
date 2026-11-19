import express from "express"
import { authenticate } from "../middlewares/auth.js"
import axios from "axios"
import { getGuildConfig, setGuildConfig } from "../lib/guildConfigRepo.js"
import { getDb } from "../lib/mongo.js"
import { encrypt } from "@sparcky/database"
import { executeRcon } from "../lib/rcon.js"

const router = express.Router()

function discordGuildIconUrl({ id, icon }, { size = 128 } = {}) {
  if (!id || !icon) return null
  return `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=${size}`
}

function discordUserAvatarUrl({ id, avatar }, { size = 128 } = {}) {
  if (!id) return null
  if (!avatar) return `https://cdn.discordapp.com/embed/avatars/0.png?size=${size}`
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=${size}`
}

function getBotToken() {
  return process.env.DISCORD_BOT_TOKEN
}

function buildBotInviteUrl(guildId) {
  const clientId = process.env.DISCORD_BOT_ID || process.env.DISCORD_CLIENT_ID
  const permissions = process.env.DISCORD_BOT_INVITE_PERMISSIONS || "0"

  if (!clientId) return null

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions,
    disable_guild_select: "true"
  })

  if (guildId) params.set("guild_id", guildId)

  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

function normalizeChannel(ch) {
  return {
    id: ch.id,
    name: ch.name ?? null,
    type: ch.type,
    parent_id: ch.parent_id ?? null,
    position: ch.position ?? 0
  }
}

function sortChannels(a, b) {
  // cat (type 4) en premier, puis position, puis nom
  const ta = a.type
  const tb = b.type
  if (ta === 4 && tb !== 4) return -1
  if (ta !== 4 && tb === 4) return 1
  if (a.position !== b.position) return a.position - b.position
  return String(a.name ?? "").localeCompare(String(b.name ?? ""))
}

function sanitizeConfigForClient(cfg) {
  if (!cfg) return cfg
  const copy = JSON.parse(JSON.stringify(cfg))
  if (copy.minecraft) {
    copy.minecraft.hasRconPassword = Boolean(copy.minecraft.rconPassword)
    copy.minecraft.rconPassword = copy.minecraft.rconPassword ? "••••••••" : ""
  }
  return copy
}

router.get("/guilds/:guildId", authenticate, async (req, res) => {
  const { guildId } = req.params
  const botToken = getBotToken()

  if (!botToken) {
    return res.status(500).json({
      error: "Missing DISCORD_BOT_TOKEN",
      hint: "Ajoute DISCORD_BOT_TOKEN dans api/.env pour pouvoir récupérer les channels et vérifier si le bot est dans la guilde."
    })
  }

  try {
    // Infos bot (vraies) via token bot
    const botUserRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bot ${botToken}` }
    })

    const botUser = botUserRes.data

    // 1) Infos guilde via bot
    const guildRes = await axios.get(`https://discord.com/api/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` }
    })

    // 2) Channels via bot
    const channelsRes = await axios.get(`https://discord.com/api/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` }
    })

    const guild = guildRes.data

    const channels = Array.isArray(channelsRes.data)
      ? channelsRes.data.map(normalizeChannel).sort(sortChannels)
      : []

    // 3) Rôles via bot
    let roles = []
    try {
      const rolesRes = await axios.get(`https://discord.com/api/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` }
      })
      if (Array.isArray(rolesRes.data)) {
        roles = rolesRes.data
          .filter(r => r.name !== "@everyone" && !r.managed)
          .sort((a, b) => b.position - a.position)
          .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : null,
            position: r.position
          }))
      }
    } catch {
      // Ignorer si manque de permissions
    }

    // Debug: vérifier si un doc existe vraiment dans la collection
    const db = await getDb()
    const collectionName = process.env.BOT_GUILD_CONFIG_COLLECTION || "guildconfigurations"
    const rawDoc = await db.collection(collectionName).findOne({ guildId })

    const config = await getGuildConfig(guildId)

    // Charger également les paramètres existants de tickets (collection ticketsettings)
    const ticketDoc = await db.collection("ticketsettings").findOne({ guildId })
    if (ticketDoc) {
      config.ticketEnabled = true
      config.ticketSupportRoleId = ticketDoc.supportRoleId || config.ticketSupportRoleId || null
      config.ticketCategoryId = ticketDoc.ticketCategoryId || config.ticketCategoryId || null
      config.ticketLogChannelId = ticketDoc.logChannelId || config.ticketLogChannelId || null
      config.ticketTypes = Array.isArray(ticketDoc.ticketTypes) ? ticketDoc.ticketTypes : ["suggestion", "partenariats", "problème", "autre"]
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[guilds] config loaded", {
        guildId,
        db: db.databaseName,
        collection: collectionName,
        hasDoc: Boolean(rawDoc),
        modLogChannel: config?.modLogChannel ?? null
      })
    }

    const payload = {
      botInGuild: true,
      inviteUrl: null,
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        iconUrl: discordGuildIconUrl({ id: guild.id, icon: guild.icon }, { size: 128 }),
        owner_id: guild.owner_id
      },
      bot: {
        id: botUser.id,
        username: botUser.username,
        avatarUrl: discordUserAvatarUrl({ id: botUser.id, avatar: botUser.avatar }, { size: 128 }),
        status: "online"
      },
      channels,
      roles,
      config: sanitizeConfigForClient(config),
      configSource: {
        db: db.databaseName,
        collection: collectionName,
        hasDoc: Boolean(rawDoc)
      }
    }

    return res.json(payload)
  } catch (err) {
    const status = err?.response?.status
    const data = err?.response?.data

    if (status === 403 || status === 404) {
      // Typiquement: bot pas dans la guilde, ou pas de permission.
      return res.status(200).json({
        botInGuild: false,
        inviteUrl: buildBotInviteUrl(guildId),
        guild: { id: guildId },
        bot: {
          id: process.env.DISCORD_BOT_ID || null,
          username: process.env.DISCORD_BOT_USERNAME || "Bot",
          avatarUrl: discordUserAvatarUrl(
            { id: process.env.DISCORD_BOT_ID, avatar: process.env.DISCORD_BOT_AVATAR },
            { size: 128 }
          ),
          status: "absent"
        },
        channels: [],
        roles: [],
        config: sanitizeConfigForClient(await getGuildConfig(guildId)),
        error: "Bot is not in this guild (or missing permissions)"
      })
    }

    console.error("/api/guilds/:guildId error", { status, message: err?.message, data })
    return res.status(502).json({ error: "Failed to fetch guild details" })
  }
})

router.get("/guilds/:guildId/config", authenticate, async (req, res) => {
  const { guildId } = req.params
  return res.json({ guildId, config: sanitizeConfigForClient(await getGuildConfig(guildId)) })
})

router.put("/guilds/:guildId/config", authenticate, async (req, res) => {
  const { guildId } = req.params
  const patch = req.body || {}

  const cleanBadWords = Array.isArray(patch.badWords)
    ? patch.badWords
        .map(w => String(w).trim())
        .filter(Boolean)
        .slice(0, 200)
    : undefined

  const cleanLanguage =
    typeof patch.language === "string"
      ? patch.language.replace(/[^a-zA-Z-]/g, "").toLowerCase().slice(0, 8)
      : undefined

  const cleanChannel = val => (typeof val === "string" && val.trim().length > 0 ? val.trim() : null)

  let cleanMinecraft = undefined
  if (patch.minecraft && typeof patch.minecraft === "object") {
    const current = await getGuildConfig(guildId)
    const existingMc = current?.minecraft || {}

    let rconPassword = existingMc.rconPassword || null
    if (typeof patch.minecraft.rconPassword === "string") {
      const trimmed = patch.minecraft.rconPassword.trim()
      if (trimmed && trimmed !== "••••••••") {
        rconPassword = encrypt(trimmed)
      } else if (!trimmed) {
        rconPassword = null
      }
    }

    cleanMinecraft = {
      enabled: typeof patch.minecraft.enabled === "boolean" ? patch.minecraft.enabled : existingMc.enabled ?? false,
      ip: typeof patch.minecraft.ip === "string" ? patch.minecraft.ip.trim().slice(0, 128) : (patch.minecraft.ip === null ? null : existingMc.ip ?? null),
      port: typeof patch.minecraft.port === "number" ? Math.max(1, Math.min(65535, Math.floor(patch.minecraft.port))) : existingMc.port ?? 25565,
      name: typeof patch.minecraft.name === "string" ? patch.minecraft.name.trim().slice(0, 64) : existingMc.name ?? "Serveur Minecraft",
      bedrock: typeof patch.minecraft.bedrock === "boolean" ? patch.minecraft.bedrock : existingMc.bedrock ?? false,
      rconEnabled: typeof patch.minecraft.rconEnabled === "boolean" ? patch.minecraft.rconEnabled : existingMc.rconEnabled ?? false,
      rconPort: typeof patch.minecraft.rconPort === "number" ? Math.max(1, Math.min(65535, Math.floor(patch.minecraft.rconPort))) : existingMc.rconPort ?? 25575,
      rconPassword,
      statusChannelId: cleanChannel(patch.minecraft.statusChannelId) ?? existingMc.statusChannelId ?? null,
      statusMessageId: cleanChannel(patch.minecraft.statusMessageId) ?? existingMc.statusMessageId ?? null
    }
  }

  // Whitelist
  const next = await setGuildConfig(guildId, {
    welcomeChannel: cleanChannel(patch.welcomeChannel),
    welcomeTitle: typeof patch.welcomeTitle === "string" ? patch.welcomeTitle.slice(0, 256) : (patch.welcomeTitle === null ? null : undefined),
    welcomeMessage: typeof patch.welcomeMessage === "string" ? patch.welcomeMessage.slice(0, 2048) : (patch.welcomeMessage === null ? null : undefined),
    welcomeColor: typeof patch.welcomeColor === "string" ? patch.welcomeColor.slice(0, 16) : undefined,
    welcomeThumbnail: typeof patch.welcomeThumbnail === "boolean" ? patch.welcomeThumbnail : undefined,
    welcomeImage: typeof patch.welcomeImage === "string" ? patch.welcomeImage.slice(0, 512) : (patch.welcomeImage === null ? null : undefined),
    welcomeDmEnabled: typeof patch.welcomeDmEnabled === "boolean" ? patch.welcomeDmEnabled : undefined,
    welcomeDmMessage: typeof patch.welcomeDmMessage === "string" ? patch.welcomeDmMessage.slice(0, 2048) : (patch.welcomeDmMessage === null ? null : undefined),

    leaveChannel: cleanChannel(patch.leaveChannel),
    leaveTitle: typeof patch.leaveTitle === "string" ? patch.leaveTitle.slice(0, 256) : (patch.leaveTitle === null ? null : undefined),
    leaveMessage: typeof patch.leaveMessage === "string" ? patch.leaveMessage.slice(0, 2048) : (patch.leaveMessage === null ? null : undefined),
    leaveColor: typeof patch.leaveColor === "string" ? patch.leaveColor.slice(0, 16) : undefined,
    leaveThumbnail: typeof patch.leaveThumbnail === "boolean" ? patch.leaveThumbnail : undefined,
    leaveImage: typeof patch.leaveImage === "string" ? patch.leaveImage.slice(0, 512) : (patch.leaveImage === null ? null : undefined),

    autoRole: cleanChannel(patch.autoRole),
    modLogChannel: cleanChannel(patch.modLogChannel),
    vocChannelId: cleanChannel(patch.vocChannelId),
    announcementChannel: cleanChannel(patch.announcementChannel),

    antispam: typeof patch.antispam === "boolean" ? patch.antispam : undefined,
    antilink: typeof patch.antilink === "boolean" ? patch.antilink : undefined,
    antiBadWords: typeof patch.antiBadWords === "boolean" ? patch.antiBadWords : undefined,
    autoSanction: typeof patch.autoSanction === "boolean" ? patch.autoSanction : undefined,
    autoSanctionRules: Array.isArray(patch.autoSanctionRules)
      ? patch.autoSanctionRules
          .filter(r => r && Number(r.warnCount) > 0 && ["timeout", "kick", "ban"].includes(r.action))
          .map(r => ({
            warnCount: Math.floor(Number(r.warnCount)),
            action: r.action,
            durationMinutes: r.action === "timeout" ? Math.max(1, Math.floor(Number(r.durationMinutes) || 10)) : 0
          }))
      : undefined,
    antiRaid: typeof patch.antiRaid === "boolean" ? patch.antiRaid : undefined,

    language: cleanLanguage && ["fr", "en", "es"].includes(cleanLanguage) ? cleanLanguage : undefined,
    badWords: cleanBadWords,

    // Economie
    economyEnabled: typeof patch.economyEnabled === "boolean" ? patch.economyEnabled : undefined,
    currencySymbol: typeof patch.currencySymbol === "string" ? patch.currencySymbol.slice(0, 8) : undefined,
    currencyName: typeof patch.currencyName === "string" ? patch.currencyName.slice(0, 32) : undefined,
    dailyAmount: typeof patch.dailyAmount === "number" ? Math.max(0, Math.floor(patch.dailyAmount)) : undefined,
    workMin: typeof patch.workMin === "number" ? Math.max(0, Math.floor(patch.workMin)) : undefined,
    workMax: typeof patch.workMax === "number" ? Math.max(0, Math.floor(patch.workMax)) : undefined,
    chatReward: typeof patch.chatReward === "number" ? Math.max(0, Math.floor(patch.chatReward)) : undefined,
    robEnabled: typeof patch.robEnabled === "boolean" ? patch.robEnabled : undefined,
    gamblingEnabled: typeof patch.gamblingEnabled === "boolean" ? patch.gamblingEnabled : undefined,
    gamblingMaxBet: typeof patch.gamblingMaxBet === "number" ? Math.max(1, Math.floor(patch.gamblingMaxBet)) : undefined,
    gamblingCooldown: typeof patch.gamblingCooldown === "number" ? Math.max(5, Math.floor(patch.gamblingCooldown)) : undefined,

    // Niveaux & XP
    xpEnabled: typeof patch.xpEnabled === "boolean" ? patch.xpEnabled : undefined,
    xpChannelId: cleanChannel(patch.xpChannelId),
    levelRoles: Array.isArray(patch.levelRoles) ? patch.levelRoles.filter(r => r && r.level > 0 && r.roleId) : undefined,

    // Tickets
    ticketEnabled: typeof patch.ticketEnabled === "boolean" ? patch.ticketEnabled : undefined,
    ticketCategoryId: cleanChannel(patch.ticketCategoryId),
    ticketSupportRoleId: cleanChannel(patch.ticketSupportRoleId),
    ticketLogChannelId: cleanChannel(patch.ticketLogChannelId),

    // Reaction Roles
    reactionRoles: Array.isArray(patch.reactionRoles) ? patch.reactionRoles : undefined,

    // Auto-Répondeur & Commandes Personnalisées
    customCommands: Array.isArray(patch.customCommands) ? patch.customCommands : undefined,

    // Question du Jour (Trivia QOTD)
    trivia: patch.trivia && typeof patch.trivia === "object" ? {
      enabled: typeof patch.trivia.enabled === "boolean" ? patch.trivia.enabled : true,
      channelId: cleanChannel(patch.trivia.channelId),
      rewardAmount: typeof patch.trivia.rewardAmount === "number" ? Math.max(1, Math.floor(patch.trivia.rewardAmount)) : 25,
      mode: ["integrated", "custom", "both"].includes(patch.trivia.mode) ? patch.trivia.mode : "both",
      customQuestions: Array.isArray(patch.trivia.customQuestions) ? patch.trivia.customQuestions.map(q => ({
        id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        question: String(q.question || "").trim().slice(0, 300),
        answers: Array.isArray(q.answers)
          ? q.answers.map(a => String(a).trim()).filter(Boolean)
          : String(q.answers || "").split(",").map(a => a.trim()).filter(Boolean),
        hint: String(q.hint || "").trim().slice(0, 150),
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date()
      })).filter(q => q.question && q.answers.length > 0) : [],
      lastQuestionDate: typeof patch.trivia.lastQuestionDate === "string" ? patch.trivia.lastQuestionDate : undefined
    } : undefined,

    // Intégration Minecraft & RCON
    minecraft: cleanMinecraft
  })

  // Synchroniser également dans la collection ticketsettings pour le bot Discord
  if (patch.ticketSupportRoleId || patch.ticketCategoryId) {
    const db = await getDb()
    await db.collection("ticketsettings").updateOne(
      { guildId },
      {
        $set: {
          guildId,
          supportRoleId: cleanChannel(patch.ticketSupportRoleId),
          ticketCategoryId: cleanChannel(patch.ticketCategoryId),
          logChannelId: cleanChannel(patch.ticketLogChannelId) || cleanChannel(patch.ticketCategoryId),
          ticketTypes: Array.isArray(patch.ticketTypes) && patch.ticketTypes.length > 0
            ? patch.ticketTypes.map(t => String(t).trim()).filter(Boolean)
            : ["suggestion", "partenariats", "problème", "autre"],
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
  }

  return res.json({ guildId, config: sanitizeConfigForClient(next) })
})

// --- Endpoints Dédiés Minecraft & RCON ---

function cleanHostAndPort(rawHost, rawPort = 25565) {
  if (!rawHost) return { host: "", port: rawPort }
  let cleaned = String(rawHost).trim().replace(/^https?:\/\//i, "")
  cleaned = cleaned.split("/")[0]
  let port = Number(rawPort) || 25565
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":")
    cleaned = parts[0].trim()
    const parsed = parseInt(parts[1], 10)
    if (!isNaN(parsed) && parsed > 0) port = parsed
  }
  return { host: cleaned, port }
}

router.post("/guilds/:guildId/minecraft/test", async (req, res) => {
  try {
    const { ip, port, bedrock } = req.body || {}
    const config = await getGuildConfig(req.params.guildId)
    const rawIp = (ip || config?.minecraft?.ip || "").trim()
    const rawPort = port || config?.minecraft?.port || 25565
    const isBedrock = typeof bedrock === "boolean" ? bedrock : Boolean(config?.minecraft?.bedrock)

    const { host: targetIp, port: targetPort } = cleanHostAndPort(rawIp, rawPort)

    console.log(`[minecraft/test] Ping test pour ${req.params.guildId} -> ${targetIp}:${targetPort} (Bedrock: ${isBedrock})`)

    if (!targetIp) {
      return res.status(400).json({ error: "Aucune adresse IP spécifiée" })
    }

    const util = await import("minecraft-server-util")
    const statusFn = isBedrock ? util.statusBedrock : util.status
    const result = await statusFn(targetIp, targetPort, { timeout: 5000, enableSRV: true })

    return res.json({
      online: true,
      players: {
        online: result.players?.online ?? 0,
        max: result.players?.max ?? 0,
        sample: result.players?.sample ?? []
      },
      version: result.version?.name || "Inconnue",
      motd: result.motd?.clean ? result.motd.clean.trim() : "",
      latency: result.roundTripLatency ?? 0
    })
  } catch (err) {
    console.warn(`[minecraft/test] Échec du ping:`, err.message)
    let errMsg = err.message || "Serveur injoignable ou hors ligne"
    if (!isBedrock && targetPort === 19132) {
      errMsg = "Port 19132 détecté pour Java : le port standard de Java est 25565 (19132 est réservé à Bedrock)."
    } else if (isBedrock && targetPort === 25565) {
      errMsg = "Port 25565 détecté pour Bedrock : le port standard de Bedrock est 19132 (25565 est réservé à Java)."
    }
    return res.status(200).json({
      online: false,
      error: errMsg
    })
  }
})

router.post("/guilds/:guildId/minecraft/test-rcon", authenticate, async (req, res) => {
  try {
    const { ip, rconPort, rconPassword } = req.body || {}
    const config = await getGuildConfig(req.params.guildId)

    const rawIp = (ip || config?.minecraft?.ip || "").trim()
    const rawPort = rconPort || config?.minecraft?.rconPort || 25575
    const { host: targetIp, port: targetPort } = cleanHostAndPort(rawIp, rawPort)

    let targetPassword = rconPassword
    if (!targetPassword || targetPassword === "••••••••") {
      targetPassword = config?.minecraft?.rconPassword
    }

    if (!targetIp) return res.status(400).json({ error: "Adresse IP manquante" })
    if (!targetPassword) return res.status(400).json({ error: "Mot de passe RCON manquant" })

    const output = await executeRcon({
      host: targetIp,
      port: targetPort,
      password: targetPassword,
      command: "list",
      timeout: 5000
    })

    return res.json({ success: true, message: "Connexion RCON établie avec succès !", output })
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message || "Échec connexion RCON" })
  }
})

router.post("/guilds/:guildId/minecraft/rcon-exec", authenticate, async (req, res) => {
  try {
    const { command } = req.body || {}
    if (!command || typeof command !== "string" || !command.trim()) {
      return res.status(400).json({ error: "Commande manquante" })
    }

    const config = await getGuildConfig(req.params.guildId)
    if (!config?.minecraft?.rconEnabled || !config?.minecraft?.rconPassword) {
      return res.status(400).json({ error: "RCON n'est pas activé ou configuré pour ce serveur" })
    }

    const output = await executeRcon({
      host: config.minecraft.ip,
      port: config.minecraft.rconPort || 25575,
      password: config.minecraft.rconPassword,
      command: command.trim().replace(/^\//, ""),
      timeout: 5000
    })

    return res.json({ success: true, output })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message || "Erreur d'exécution RCON" })
  }
})

export default router
