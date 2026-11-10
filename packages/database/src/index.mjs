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
  defaultGuildConfig
} = db;

export default db;
