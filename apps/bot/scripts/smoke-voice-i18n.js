require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-voice-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log(
    "VOICE.CREATE.ASK_NAME:",
    await t({ guildId }, "VOICE.CREATE.ASK_NAME", { member: "@Test" }),
  );
  console.log(
    "VOICE.CREATE.DEFAULT_NAME:",
    await t({ guildId }, "VOICE.CREATE.DEFAULT_NAME", { username: "Scorpion" }),
  );

  await mongoose.disconnect();
})();

