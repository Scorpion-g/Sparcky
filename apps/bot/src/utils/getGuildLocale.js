const GuildConfiguration = require("../models/GuildConfiguration");
const logger = require("./logger");

const SUPPORTED_LOCALES = new Set(["fr", "en"]);

function normalizeLocale(locale) {
  if (!locale || typeof locale !== "string") return null;
  const lower = locale.toLowerCase();
  // ex: en-US -> en
  const base = lower.split(/[-_]/)[0];
  return SUPPORTED_LOCALES.has(base) ? base : null;
}

/**
 * Résout la langue à utiliser pour une guild.
 * - priorité: GuildConfiguration.language
 * - fallback: interaction.locale / guild.preferredLocale
 * - fallback final: fr
 */
async function getGuildLocale({ guildId, interaction } = {}) {
  const resolvedGuildId = guildId || interaction?.guildId || interaction?.guild?.id;

  if (resolvedGuildId) {
    const conf = await GuildConfiguration.findOne({ guildId: resolvedGuildId }).lean();
    const dbLocale = normalizeLocale(conf?.language);

    if (process.env.DEBUG_I18N === "1") {
      logger.info(
        `[i18n] guildId=${resolvedGuildId} db.language=${conf?.language} -> locale=${dbLocale || "(none)"}`,
      );
    }

    if (dbLocale) return dbLocale;
  }

  const interactionLocale = normalizeLocale(interaction?.locale);
  if (interactionLocale) return interactionLocale;

  const preferred = normalizeLocale(interaction?.guild?.preferredLocale);
  if (preferred) return preferred;

  return "fr";
}

module.exports = {
  getGuildLocale,
  normalizeLocale,
  SUPPORTED_LOCALES,
};
