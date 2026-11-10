import db from "./index.cjs";

export const {
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
} = db;

export default db;
