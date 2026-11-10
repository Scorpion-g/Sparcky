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
  getChangelog
} = db;

export default db;
