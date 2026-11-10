require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { getGuildLocale } = require("../src/utils/getGuildLocale");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/debug-locale.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  const locale = await getGuildLocale({ guildId });
  console.log("Resolved locale:", locale);

  console.log("ERRORS.COMMAND_FAILED:", await t({ guildId }, "ERRORS.COMMAND_FAILED"));
  console.log("MENTION.TITLE:", await t({ guildId }, "MENTION.TITLE", { username: "Test" }));

  await mongoose.disconnect();
})();
