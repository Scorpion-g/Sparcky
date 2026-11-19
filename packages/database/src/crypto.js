const crypto = require("node:crypto");

const ALGORITHM = "aes-256-gcm";
const DEFAULT_FALLBACK_SECRET = "sparcky-default-rcon-secret-key-32b!";

function getSecret() {
  return process.env.RCON_SECRET || process.env.JWT_SECRET || DEFAULT_FALLBACK_SECRET;
}

function getCipherKey() {
  return crypto.createHash("sha256").update(getSecret()).digest();
}

/**
 * Chiffre une chaîne de caractères avec AES-256-GCM.
 * Format de sortie: `ivHex:authTagHex:encryptedHex`
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getCipherKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM.
 */
function decrypt(cipherText) {
  if (!cipherText) return null;
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    // Si la chaîne n'est pas au format iv:tag:payload, on retourne tel quel (rétrocompatibilité)
    return cipherText;
  }
  try {
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getCipherKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Erreur lors du déchiffrement RCON:", err.message);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
