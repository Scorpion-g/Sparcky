require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-infouser-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("INFOUSER.TITLE:", await t({ guildId }, "INFOUSER.TITLE", { tag: "Test#0001" }));
  console.log("INFOUSER.NO_ROLE:", await t({ guildId }, "INFOUSER.NO_ROLE"));
  console.log(
    "INFOUSER.LEVEL_VALUE:",
    await t({ guildId }, "INFOUSER.LEVEL_VALUE", { level: 3, xp: 120 }),
  );
  console.log("INFOUSER.ACTIVITY.PLAYING:", await t({ guildId }, "INFOUSER.ACTIVITY.PLAYING"));

  await mongoose.disconnect();
})();

