require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  const warnCount = Number(process.argv[3] || 3);
  if (!guildId) {
    console.log("Usage: node scripts/smoke-autosanction-i18n.js <guildId> [warnCount]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("locale check:", await t({ guildId }, "CONFIG.LANGUAGE.TITLE"));
  console.log(
    "AUTOSANCTION.REASON:",
    await t({ guildId }, "AUTOSANCTION.REASON", { warnCount }),
  );
  console.log(
    "AUTOSANCTION.LOG.TIMEOUT:",
    await t({ guildId }, "AUTOSANCTION.LOG.TIMEOUT", {
      memberId: "123",
      warnCount,
    }),
  );

  await mongoose.disconnect();
})();

