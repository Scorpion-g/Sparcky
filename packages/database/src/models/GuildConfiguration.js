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

  // --- Intégrations Réseaux Sociaux (YouTube & Twitch) ---
  integrations: {
    youtube: {
      type: [
        {
          id: { type: String, required: true },
          channelId: { type: String, required: true },
          channelTitle: { type: String, default: "" },
          channelHandle: { type: String, default: "" },
          discordChannelId: { type: String, required: true },
          roleId: { type: String, default: null },
          customMessage: {
            type: String,
            default: "🎬 **Nouvelle vidéo de {author} !**\n\n📌 **{title}**\n👉 {url}"
          },
          lastVideoId: { type: String, default: null },
          enabled: { type: Boolean, default: true },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    twitch: {
      type: [
        {
          id: { type: String, required: true },
          streamerLogin: { type: String, required: true },
          streamerName: { type: String, default: "" },
          discordChannelId: { type: String, required: true },
          roleId: { type: String, default: null },
          customMessage: {
            type: String,
            default: "🔴 **{streamer} est en direct sur Twitch !**\n\n🎮 Jeu : **{game}**\n📌 **{title}**\n👉 {url}"
          },
          isLive: { type: Boolean, default: false },
          lastStreamId: { type: String, default: null },
          enabled: { type: Boolean, default: true },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },

  // --- Formulaires Personnalisés & Candidatures (Form Builder) ---
  forms: {
    type: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, default: "Cliquez sur le bouton ci-dessous pour postuler !" },
        buttonLabel: { type: String, default: "Postuler" },
        buttonEmoji: { type: String, default: "📋" },
        buttonStyle: { type: String, default: "PRIMARY" },
        channelId: { type: String, required: true },
        targetChannelId: { type: String, required: true },
        roleToGiveOnAccept: { type: String, default: null },
        messageId: { type: String, default: null },
        fields: [
          {
            id: { type: String, required: true },
            label: { type: String, required: true },
            placeholder: { type: String, default: "" },
            style: { type: String, enum: ["short", "paragraph"], default: "short" },
            required: { type: Boolean, default: true },
            minLength: { type: Number, default: 1 },
            maxLength: { type: Number, default: 1000 }
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
  },

  // --- Mini-Jeu Compteur (Counting Game) ---
  counting: {
    channelId: { type: String, default: null },
    currentNumber: { type: Number, default: 1 },
    lastUserId: { type: String, default: null },
    record: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
  },

  // --- Question du Jour (QOTD Trivia) ---
  trivia: {
    channelId: { type: String, default: null },
    rewardAmount: { type: Number, default: 25 },
    enabled: { type: Boolean, default: true },
    lastQuestionDate: { type: String, default: null }
  }
});

module.exports = mongoose.model("GuildConfiguration", guildConfigSchema);
