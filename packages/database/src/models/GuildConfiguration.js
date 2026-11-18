const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  welcomeChannel: { type: String, default: null },
  welcomeTitle: { type: String, default: null },
  welcomeMessage: { type: String, default: null },
  welcomeColor: { type: String, default: "#22C55E" },
  welcomeThumbnail: { type: Boolean, default: true },
  welcomeImage: { type: String, default: null },
  welcomeDmEnabled: { type: Boolean, default: false },
  welcomeDmMessage: { type: String, default: null },

  leaveChannel: { type: String, default: null },
  leaveTitle: { type: String, default: null },
  leaveMessage: { type: String, default: null },
  leaveColor: { type: String, default: "#EF4444" },
  leaveThumbnail: { type: Boolean, default: true },
  leaveImage: { type: String, default: null },

  autoRole: { type: String, default: null },
  antispam: { type: Boolean, default: false },
  antilink: { type: Boolean, default: false },
  modLogChannel: { type: String, default: null },
  antiBadWords: { type: Boolean, default: false },
  badWords: { type: [String], default: [] },
  autoSanction: { type: Boolean, default: false },
  autoSanctionRules: {
    type: [
      {
        warnCount: { type: Number, required: true },
        action: { type: String, enum: ["timeout", "kick", "ban"], required: true },
        durationMinutes: { type: Number, default: 10 }
      }
    ],
    default: [
      { warnCount: 3, action: "timeout", durationMinutes: 10 },
      { warnCount: 5, action: "kick", durationMinutes: 0 },
      { warnCount: 7, action: "ban", durationMinutes: 0 }
    ]
  },
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

  // --- Reaction Roles ---
  reactionRoles: {
    type: [
      {
        id: { type: String, required: true },
        channelId: { type: String, required: true },
        messageId: { type: String, default: null },
        title: { type: String, default: "🎭 Rôles" },
        description: { type: String, default: "Cliquez sur les boutons ci-dessous pour obtenir ou retirer vos rôles." },
        color: { type: String, default: "#6366F1" },
        displayType: { type: String, enum: ["buttons", "dropdown"], default: "buttons" },
        roles: [
          {
            roleId: { type: String, required: true },
            label: { type: String, default: "" },
            emoji: { type: String, default: "" },
            style: { type: String, default: "PRIMARY" }
          }
        ],
        createdAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  },

  // --- Auto-Répondeur & Commandes Personnalisées ---
  customCommands: {
    type: [
      {
        id: { type: String, required: true },
        trigger: { type: String, required: true },
        response: { type: String, required: true },
        matchType: { type: String, default: "exact" }, // "exact" | "startsWith" | "contains"
        isEmbed: { type: Boolean, default: false },
        embedTitle: { type: String, default: "" },
        embedColor: { type: String, default: "#6366F1" },
        enabled: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  }
});

module.exports = mongoose.model("GuildConfiguration", guildConfigSchema);
