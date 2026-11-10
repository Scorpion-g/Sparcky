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
    vocChannelId: null
  };
}

module.exports = {
  defaultGuildConfig
};
