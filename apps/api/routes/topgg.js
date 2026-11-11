import express from "express"
import { getDb } from "../lib/mongo.js"

const router = express.Router()

/**
 * Endpoint Webhook pour Top.gg
 * Documentation Top.gg: https://docs.top.gg/resources/webhooks/
 */
router.post("/topgg/webhook", async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const expectedAuth = process.env.TOPGG_WEBHOOK_AUTH

    // Si un mot de passe webhook est défini dans l'environnement, on le valide
    if (expectedAuth && authHeader !== expectedAuth) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { bot, user: userId, type, isWeekend } = req.body || {}

    if (!userId) {
      return res.status(400).json({ error: "Missing user id" })
    }

    const db = await getDb()

    // Bonus weekend doublé selon les directives Top.gg
    const multiplier = isWeekend ? 2 : 1
    const rewardCoins = 1000 * multiplier
    const rewardXp = 500 * multiplier

    // Mettre à jour le solde et la date de vote pour tous les serveurs où le joueur est inscrit
    const userUpdate = await db.collection("users").updateMany(
      { userId },
      {
        $inc: { balance: rewardCoins },
        $set: { lastVote: new Date() },
      }
    )

    // Mettre à jour l'XP de progression
    const levelUpdate = await db.collection("levels").updateMany(
      { userId },
      {
        $inc: { xp: rewardXp },
      }
    )

    console.log(
      `[TOP.GG WEBHOOK] Vote reçu pour userId=${userId} (${type}, isWeekend=${isWeekend}) -> +${rewardCoins} coins, +${rewardXp} xp (users mis à jour: ${userUpdate.modifiedCount})`
    )

    return res.status(200).json({
      ok: true,
      rewarded: true,
      coins: rewardCoins,
      xp: rewardXp,
      updatedUsers: userUpdate.modifiedCount,
    })
  } catch (error) {
    console.error("[TOP.GG WEBHOOK] Erreur lors du traitement du vote:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
})

/**
 * Endpoint informatif sur le statut du vote Top.gg
 */
router.get("/topgg/status", (_req, res) => {
  res.json({
    active: true,
    hasToken: Boolean(process.env.TOPGG_TOKEN),
    hasWebhookAuth: Boolean(process.env.TOPGG_WEBHOOK_AUTH),
    botId: process.env.CLIENT_ID || "1275197373580050604",
  })
})

export default router
