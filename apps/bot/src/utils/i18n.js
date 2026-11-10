const path = require("path");
const i18next = require("i18next");
const Backend = require("i18next-fs-backend");
const logger = require("./logger");

let initPromise;

function initI18n() {
  if (initPromise) return initPromise;

  const loadPath = path.join(process.cwd(), "locales/{{lng}}/translation.json");

  initPromise = i18next
    .use(Backend)
    .init({
      // Langue par défaut uniquement si aucune n’est fournie.
      lng: "fr",
      fallbackLng: "fr",
      supportedLngs: ["fr", "en"],
      load: "languageOnly",
      ns: ["translation"],
      defaultNS: "translation",
      returnEmptyString: false,
      returnNull: false,
      interpolation: { escapeValue: false },
      backend: {
        loadPath,
      },
      // IMPORTANT: on ne sauvegarde pas les clés manquantes et on ne change pas la langue globale.
      saveMissing: false,
      missingKeyHandler(lngs, ns, key) {
        logger.warn(`[i18n] Missing key '${ns}:${key}' for ${lngs}`);
      },
    })
    .then(async () => {
      // Précharge les 2 langues pour éviter de dépendre du lazy-loading au 1er appel.
      await i18next.loadLanguages(["fr", "en"]);
      if (process.env.DEBUG_I18N === "1") {
        logger.info(`[i18n] loaded fr=${i18next.hasResourceBundle("fr", "translation")} en=${i18next.hasResourceBundle("en", "translation")} loadPath=${loadPath}`);
      }
    })
    .catch((err) => {
      logger.error("[i18n] Init failed:", err);
      throw err;
    });

  return initPromise;
}

module.exports = { initI18n, i18next };
