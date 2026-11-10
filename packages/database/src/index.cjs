const mongoose = require("mongoose");
const GuildConfiguration = require("./models/GuildConfiguration");
const Giveaway = require("./models/Giveaway");
const Level = require("./models/Level");
const Shop = require("./models/Shop");
const Ticket = require("./models/Ticket");
const User = require("./models/User");
const Warn = require("./models/Warn");
const { defaultGuildConfig } = require("./defaults");
const {
  CURRENT_VERSION,
  CHANGELOGS,
  getLatestChangelog,
  getChangelog,
  GITHUB_REPO,
  GITHUB_REPO_URL,
  getGitHubReleaseUrl
} = require("./version");

module.exports = {
  mongoose,
  GuildConfiguration,
  Giveaway,
  Level,
  Shop,
  Ticket,
  User,
  Warn,
  defaultGuildConfig,
  CURRENT_VERSION,
  CHANGELOGS,
  getLatestChangelog,
  getChangelog,
  GITHUB_REPO,
  GITHUB_REPO_URL,
  getGitHubReleaseUrl
};
