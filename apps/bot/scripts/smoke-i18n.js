const { initI18n } = require("../src/utils/i18n");
const { t } = require("../src/utils/t");

(async () => {
  await initI18n();

  const fakeFr = { guildId: "test-fr" };
  const fakeEn = { guildId: "test-en" };

  // Sans DB, getGuildLocale retombe sur fr.
  console.log("FR NO_PERMISSION:", await t(fakeFr, "ERRORS.NO_PERMISSION"));
  console.log(
    "FR WARN_SENT:",
    await t(fakeFr, "SUCCESS.WARN_SENT", { member: "@User", reason: "Test" }),
  );

  // Si tu veux tester EN via DB, exécute /language en en serveur.
  // Ici c'est juste un smoke test de chargement.
  console.log("EN NO_PERMISSION:", await t({ ...fakeEn, locale: "en" }, "ERRORS.NO_PERMISSION"));
})();

