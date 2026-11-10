// src/utils/badWordsUtil.js
const defaultBadWords = require('../data/badWorlds'); // optional fallback list

// normalise le texte pour attraper les variations (c0nnard, f*ck, accents, points, etc.)
function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
    // remplace les leetspeak courants
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    // supprime ponctuation et caractères non alphanumériques (garde espaces)
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Échappe mot pour regex (sécurité)
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vérifie si un message contient un bad word
 * @param {String} message
 * @param {String[]} wordsList - liste de mots interdits (non normalisés)
 * @returns {boolean}
 */
function containsBadWord(message, wordsList = []) {
  const clean = normalizeText(message);
  if (!clean) return false;

  // normalise la liste (lowercase, no accents, remove punctuation in words)
  const normalizedWords = (wordsList.length ? wordsList : defaultBadWords)
    .map(w => normalizeText(w))
    .filter(Boolean);

  // Créer une regex qui cherche les mots entiers
  for (const word of normalizedWords) {
    if (!word) continue;
    const rx = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (rx.test(clean)) return true;
  }
  return false;
}

module.exports = { normalizeText, containsBadWord };

