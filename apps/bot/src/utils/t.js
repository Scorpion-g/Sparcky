const { initI18n, i18next } = require("./i18n");
const { getGuildLocale } = require("./getGuildLocale");

/**
 * Traduit une clé i18n en fonction de la langue du serveur.
 * @param {import('discord.js').BaseInteraction | { guildId?: string }} target
 * @param {string} key
 * @param {Record<string, any>} [vars]
 */
async function t(target, key, vars = {}) {
  await initI18n();

  const lng = await getGuildLocale({
    guildId: target?.guildId,
    interaction: target,
  });

  // Cache local sur l'interaction pour éviter de refaire des lookups DB
  // et pour permettre à d'autres features (help) d'utiliser la même locale.
  if (target && typeof target === "object") {
    try {
      target._resolvedLocale = lng;
    } catch {
      // ignore
    }
  }

  const fixedT = i18next.getFixedT(lng);
  return fixedT(key, {
    ...vars,
  });
}

/**
 * Attache un helper `interaction.t(key, vars)`.
 */
function attachT(interaction) {
  if (!interaction || typeof interaction !== "object") return;
  if (interaction.t) return;

  Object.defineProperty(interaction, "t", {
    enumerable: false,
    configurable: false,
    value: (key, vars) => t(interaction, key, vars),
  });

  // Permet de récupérer facilement la langue déjà choisie par la guild (DB)
  // pour d'autres besoins (ex: afficher les descriptions localisées des commandes).
  if (!Object.prototype.hasOwnProperty.call(interaction, "_resolvedLocale")) {
    Object.defineProperty(interaction, "_resolvedLocale", {
      enumerable: false,
      configurable: false,
      writable: true,
      value: null,
    });
  }
}

module.exports = {
  t,
  attachT,
};
