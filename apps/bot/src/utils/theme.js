const { EmbedBuilder } = require("discord.js");

const COLORS = {
  PRIMARY: 0x6366f1, // Sparcky Indigo (marque / signature)
  SUCCESS: 0x10b981, // Vert Émeraude (victoires, validations, succès)
  DANGER: 0xef4444,  // Rouge Crimson (bans, kicks, erreurs critiques)
  WARNING: 0xf59e0b, // Orange Ambre (warns, timeouts, alertes)
  INFO: 0x38bdf8,    // Bleu Ciel (informations, configurations, help)
  NEUTRAL: 0x64748b  // Gris Ardoise (statuts neutres, logs)
};

/**
 * Crée un Embed Discord harmonisé selon la charte graphique de Sparcky
 */
function createSparkyEmbed({
  title,
  description,
  color = COLORS.PRIMARY,
  fields,
  thumbnail,
  image,
  footerText = "God_Sparky • Bot Discord Polyvalent",
  footerIcon,
  timestamp = true
} = {}) {
  const embed = new EmbedBuilder().setColor(color);

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields && Array.isArray(fields) && fields.length > 0) {
    embed.addFields(fields);
  }
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (footerText) {
    embed.setFooter({ text: footerText, iconURL: footerIcon });
  }
  if (timestamp) embed.setTimestamp();

  return embed;
}

module.exports = {
  COLORS,
  createSparkyEmbed
};
