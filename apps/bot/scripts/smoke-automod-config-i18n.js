require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-automod-config-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("ANTILINK.TITLE:", await t({ guildId }, "AUTOMOD_CONFIG.ANTILINK.TITLE"));
  console.log("ANTILINK.ENABLED:", await t({ guildId }, "AUTOMOD_CONFIG.ANTILINK.ENABLED"));
  console.log("ANTISPAM.DISABLED:", await t({ guildId }, "AUTOMOD_CONFIG.ANTISPAM.DISABLED"));
  console.log(
    "LOGCHANNEL.DESCRIPTION:",
    await t({ guildId }, "AUTOMOD_CONFIG.LOGCHANNEL.DESCRIPTION", { channel: "#logs" }),
  );
  console.log(
    "AUTOSANCTION.ENABLED_TITLE:",
    await t({ guildId }, "AUTOMOD_CONFIG.AUTOSANCTION.ENABLED_TITLE"),
  );
  console.log(
    "ANTIRAID.INVALID_ACTION:",
    await t({ guildId }, "AUTOMOD_CONFIG.ANTIRAID.INVALID_ACTION"),
  );

  await mongoose.disconnect();
})();

