require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-utiles-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("DELMESS.TITLE:", await t({ guildId }, "UTILES.DELMESS.TITLE"));
  console.log(
    "DELMESS.SUCCESS:",
    await t({ guildId }, "UTILES.DELMESS.SUCCESS", { count: 3 }),
  );
  console.log("EMBED.INVALID_IMAGE_URL:", await t({ guildId }, "UTILES.EMBED.INVALID_IMAGE_URL"));
  console.log(
    "ROLEREACT.BUTTON_LABEL:",
    await t({ guildId }, "UTILES.ROLEREACT.BUTTON_LABEL", { role: "VIP" }),
  );

  await mongoose.disconnect();
})();

