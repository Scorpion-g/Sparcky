function defaultGuildConfig() {
  return {
    guildId: null,
    welcomeChannel: null,
    leaveChannel: null,
    autoRole: null,
    antispam: false,
    antilink: false,
    modLogChannel: null,
    antiBadWords: false,
    badWords: [],
    autoSanction: false,
    antiRaid: false,
    language: "fr",
    vocChannelId: null,

    // Economie
    currencySymbol: "$",
    currencyName: "Coins",
    dailyAmount: 500,
    workMin: 50,
    workMax: 250,
    chatReward: 0,
    robEnabled: false,

    // Niveaux & XP
    xpEnabled: true,
    xpChannelId: null,
    levelRoles: [],

    // Tickets
    ticketEnabled: false,
    ticketCategoryId: null,
    ticketSupportRoleId: null,
    ticketLogChannelId: null
  };
}

module.exports = {
  defaultGuildConfig
};
