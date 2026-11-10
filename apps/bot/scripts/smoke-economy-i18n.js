require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-economy-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("GUILD_ONLY:", await t({ guildId }, "ERRORS.GUILD_ONLY"));
  console.log("DAILY.ALREADY_CLAIMED:", await t({ guildId }, "ECONOMY.DAILY.ALREADY_CLAIMED"));
  console.log(
    "DAILY.CLAIMED:",
    await t({ guildId }, "ECONOMY.DAILY.CLAIMED", { amount: 500, balance: 1337 }),
  );
  console.log(
    "MONEY.SELF:",
    await t({ guildId }, "ECONOMY.MONEY.SELF", { balance: 42 }),
  );
  console.log(
    "PAY.INSUFFICIENT:",
    await t({ guildId }, "ECONOMY.PAY.INSUFFICIENT"),
  );
  console.log(
    "LEADERBOARD.TITLES.MONEY:",
    await t({ guildId }, "ECONOMY.LEADERBOARD.TITLES.MONEY"),
  );

  await mongoose.disconnect();
})();

