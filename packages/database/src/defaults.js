function defaultGuildConfig() {
  return {
    guildId: null,
    welcomeChannel: null,
    welcomeTitle: null,
    welcomeMessage: null,
    welcomeColor: "#22C55E",
    welcomeThumbnail: true,
    welcomeImage: null,
    welcomeDmEnabled: false,
    welcomeDmMessage: null,

    leaveChannel: null,
    leaveTitle: null,
    leaveMessage: null,
    leaveColor: "#EF4444",
    leaveThumbnail: true,
    leaveImage: null,

    autoRole: null,
    antispam: false,
    antilink: false,
    modLogChannel: null,
    antiBadWords: false,
    badWords: [],
    autoSanction: false,
    autoSanctionRules: [
      { warnCount: 3, action: "timeout", durationMinutes: 10 },
      { warnCount: 5, action: "kick", durationMinutes: 0 },
      { warnCount: 7, action: "ban", durationMinutes: 0 }
    ],
    antiRaid: false,
    language: "fr",
    vocChannelId: null,
    announcementChannel: null,
    lastAnnouncedVersion: null,

    // Economie
    economyEnabled: true,
    currencySymbol: "$",
    currencyName: "Coins",
    dailyAmount: 500,
    workMin: 50,
    workMax: 250,
    chatReward: 0,
    robEnabled: false,
    gamblingEnabled: true,
    gamblingMaxBet: 500,
    gamblingCooldown: 45,

    // Niveaux & XP
    xpEnabled: true,
    xpChannelId: null,
    levelRoles: [],

    // Tickets
    ticketEnabled: false,
    ticketCategoryId: null,
    ticketSupportRoleId: null,
    ticketLogChannelId: null,

    // Reaction Roles
    reactionRoles: [],

    // Auto-Répondeur & Commandes Personnalisées
    customCommands: [],

    // Intégrations (Alertes YouTube & Twitch)
    integrations: {
      youtube: [],
      twitch: []
    },

    // Formulaires Personnalisés & Candidatures
    forms: [],

    // Mini-Jeu Compteur (Counting Game)
    counting: {
      channelId: null,
      currentNumber: 1,
      lastUserId: null,
      record: 0,
      enabled: true
    },

    // Question du Jour (QOTD Trivia)
    trivia: {
      channelId: null,
      rewardAmount: 25,
      enabled: true,
      mode: "both",
      customQuestions: [],
      lastQuestionDate: null
    },

    // Intégration Minecraft (Optionnelle par serveur)
    minecraft: {
      enabled: false,
      ip: null,
      port: 25565,
      name: "Serveur Minecraft",
      bedrock: false,
      statusChannelId: null,
      statusMessageId: null,
      rconEnabled: false,
      rconPort: 25575,
      rconPassword: null
    }
  };
}

module.exports = {
  defaultGuildConfig
};
