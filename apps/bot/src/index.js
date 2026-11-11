const path = require('path');
const dotenv = require('dotenv');

// Charge en priorité le .env de apps/bot puis celui de la racine
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { Client, IntentsBitField, Options } = require('discord.js');
const mongoose = require('mongoose');
const eventHandler = require('./handlers/eventHandler');
const logger = require('./utils/logger');
const { initI18n } = require('./utils/i18n');

const express = require("express");

const app = express();
const port = process.env.BOT_PORT || process.env.PORT || 3000;

// Petit état interne pour la readiness
let discordReady = false;

app.get("/", (req, res) => res.send("Bot running"));
app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.get("/readyz", (req, res) => {
  if (discordReady) return res.status(200).send("ready");
  return res.status(503).send("not-ready");
});

const server = app.listen(port, () => console.log(`Healthcheck server running on port ${port}`));
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${port} déjà utilisé pour le healthcheck, tentative sur le port ${Number(port) + 1}...`);
    app.listen(Number(port) + 1, () => console.log(`Healthcheck server running on port ${Number(port) + 1}`));
  } else {
    logger.error(`Erreur healthcheck server: ${err.message}`);
  }
});

// Gestion des erreurs globales
process.on("unhandledRejection", (reason) => {
  logger.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("❌ Uncaught Exception:", err);
});

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildPresences,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildModeration,
    IntentsBitField.Flags.GuildIntegrations,
    IntentsBitField.Flags.GuildWebhooks,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.DirectMessageReactions,
    IntentsBitField.Flags.DirectMessageTyping,
  ],makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    GuildMemberManager: 50,
    UserManager: 50,
  }),
});

client.on("ready", () => {
  discordReady = true;
});

client.on("error", (err) => {
  logger.error("❌ Discord client error:", err);
});

client.on("shardError", (err) => {
  logger.error("❌ Discord shard error:", err);
});

// Initialise la collection pour les commandes
client.commands = new Map();

(async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB.');

    // i18n
    await initI18n();

    // Charge tous les events
    eventHandler(client);

    logger.info("Tentative de connexion à Discord...");
    await client.login(process.env.TOKEN);
  } catch (error) {
    console.error('Erreur au lancement du bot:', error);
  }
})();
