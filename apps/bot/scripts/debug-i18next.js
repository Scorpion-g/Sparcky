require("dotenv").config();
const { initI18n, i18next } = require("../src/utils/i18n");

(async () => {
  const key = process.argv[2] || "ERRORS.COMMAND_FAILED";

  await initI18n();

  console.log("key:", key);
  console.log("i18next.language:", i18next.language);
  console.log("i18next.languages:", i18next.languages);
  console.log(
    "hasResourceBundle(fr):",
    i18next.hasResourceBundle("fr", "translation"),
  );
  console.log(
    "hasResourceBundle(en):",
    i18next.hasResourceBundle("en", "translation"),
  );

  console.log("t() default:", i18next.t(key));
  console.log("t() lng=en:", i18next.t(key, { lng: "en" }));
  console.log("t() lng=fr:", i18next.t(key, { lng: "fr" }));

  const fixedEn = i18next.getFixedT("en");
  const fixedFr = i18next.getFixedT("fr");
  console.log("getFixedT(en):", fixedEn(key));
  console.log("getFixedT(fr):", fixedFr(key));
})();
