const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  welcomeChannel: { type: String, default: null },
  leaveChannel: { type: String, default: null },
  autoRole: { type: String, default: null },
  antispam: { type: Boolean, default: false },
  antilink: { type: Boolean, default: false },
  modLogChannel: { type: String, default: null },
  antiBadWords: { type: Boolean, default: false },
  badWords: { type: [String], default: [] },
  autoSanction: { type: Boolean, default: false },
  antiRaid: { type: Boolean, default: false },
  language: { type: String, default: "fr" },
  vocChannelId: { type: String, default: null },
  announcementChannel: { type: String, default: null },
  lastAnnouncedVersion: { type: String, default: null },

  // --- Economie ---
  economyEnabled: { type: Boolean, default: true },
  currencySymbol: { type: String, default: "$" },
  currencyName: { type: String, default: "Coins" },
  dailyAmount: { type: Number, default: 500 },
  workMin: { type: Number, default: 50 },
  workMax: { type: Number, default: 250 },
  chatReward: { type: Number, default: 0 },
  robEnabled: { type: Boolean, default: false },

  // --- Niveaux & XP ---
  xpEnabled: { type: Boolean, default: true },
  xpChannelId: { type: String, default: null }, // null = même salon, "none" = muet, ID = salon spécifique
  levelRoles: {
    type: [{ level: Number, roleId: String }],
    default: [],
  },

  // --- Tickets ---
  ticketEnabled: { type: Boolean, default: false },
  ticketCategoryId: { type: String, default: null },
  ticketSupportRoleId: { type: String, default: null },
  ticketLogChannelId: { type: String, default: null },
});

module.exports = mongoose.model("GuildConfiguration", guildConfigSchema);
