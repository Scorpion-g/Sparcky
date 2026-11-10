require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-misc-config-voice-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("MISC.PING.CALCULATING:", await t({ guildId }, "MISC.PING.CALCULATING"));
  console.log(
    "MISC.PING.PONG:",
    await t({ guildId }, "MISC.PING.PONG", { latency: 12, apiLatency: 42 }),
  );
  console.log(
    "CONFIG_CMD.AUTOROLE.DESCRIPTION:",
    await t({ guildId }, "CONFIG_CMD.AUTOROLE.DESCRIPTION", { role: "@VIP" }),
  );
  console.log(
    "VOICE.CONFIG.DESCRIPTION:",
    await t({ guildId }, "VOICE.CONFIG.DESCRIPTION", { channelId: "123" }),
  );

  await mongoose.disconnect();
})();

