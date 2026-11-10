require("dotenv").config();
const mongoose = require("mongoose");
const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  const guildId = process.argv[2];
  if (!guildId) {
    console.log("Usage: node scripts/smoke-shop-i18n.js <guildId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await initI18n();

  console.log("SHOP.INFO.TITLE:", await t({ guildId }, "SHOP.INFO.TITLE"));
  console.log(
    "SHOP.BUY.SUCCESS:",
    await t({ guildId }, "SHOP.BUY.SUCCESS", { name: "Test", price: 10 }),
  );
  console.log(
    "SHOP.ADD.SUCCESS:",
    await t({ guildId }, "SHOP.ADD.SUCCESS", {
      name: "Item",
      price: 99,
      stockLabel: "Unlimited",
    }),
  );

  await mongoose.disconnect();
})();

