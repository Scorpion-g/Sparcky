require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-chifumi-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("CHIFUMI.INSUFFICIENT_FUNDS:", await t({ guildId }, "FUN.CHIFUMI.ERRORS.INSUFFICIENT_FUNDS"));
  console.log(
    "CHIFUMI.PVP.ASK:",
    await t({ guildId }, "FUN.CHIFUMI.PVP.ASK", { opponent: "@User", betAmount: 50 }),
  );
  console.log(
    "CHIFUMI.PVP.WIN_REWARD:",
    await t({ guildId }, "FUN.CHIFUMI.PVP.WIN_REWARD", { winner: "A", loser: "B", amount: 100 }),
  );
  console.log("CHIFUMI.RESULTS.BOT_WINS:", await t({ guildId }, "FUN.CHIFUMI.RESULTS.BOT_WINS"));

  await mongoose.disconnect();
})();

