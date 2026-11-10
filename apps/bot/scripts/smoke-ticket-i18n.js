require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-ticket-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("TICKET.CLOSE.SUCCESS:", await t({ guildId }, "TICKET.CLOSE.SUCCESS"));
  console.log(
    "TICKET.TRANSCRIPT_FILENAME:",
    await t({ guildId }, "TICKET.TRANSCRIPT_FILENAME", { channel: "ticket-test" }),
  );

  await mongoose.disconnect();
})();

