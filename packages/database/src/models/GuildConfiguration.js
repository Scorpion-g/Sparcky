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
});

module.exports = mongoose.model("GuildConfiguration", guildConfigSchema);
