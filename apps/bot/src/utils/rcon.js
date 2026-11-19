const { Rcon } = require("rcon-client");
const { decrypt } = require("@sparcky/database");
const logger = require("./logger");

/**
 * Supprime les codes de couleur et formatage Minecraft (§a, §l, §r, etc.)
 */
function cleanMinecraftColors(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/§[0-9a-fk-or]/gi, "").trim();
}

/**
 * Exécute une commande sur un serveur Minecraft via le protocole RCON.
 * Respecte le pattern one-shot : connecte, envoie, déconnecte avec timeout strict.
 */
async function executeRcon({
  host,
  port = 25575,
  password,
  command,
  timeout = 5000,
}) {
  if (!host) throw new Error("Hôte RCON non spécifié");
  if (!password) throw new Error("Mot de passe RCON non spécifié");
  if (!command) throw new Error("Aucune commande spécifiée");

  // Déchiffre le mot de passe si celui-ci est chiffré en BDD
  let plainPassword = password;
  const isEncryptedFormat =
    typeof password === "string" && password.split(":").length === 3;
  if (isEncryptedFormat) {
    const decrypted = decrypt(password);
    if (!decrypted) {
      throw new Error(
        "Impossible de déchiffrer le mot de passe RCON (clé de chiffrement RCON_SECRET invalide)",
      );
    }
    plainPassword = decrypted;
  }

  let rcon = null;
  let timer = null;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Timeout RCON dépassé (${timeout}ms)`));
      }, timeout);
    });

    const executionPromise = (async () => {
      rcon = await Rcon.connect({
        host,
        port: Number(port) || 25575,
        password: plainPassword,
        timeout,
      });

      const response = await rcon.send(command);
      return cleanMinecraftColors(response);
    })();

    const result = await Promise.race([executionPromise, timeoutPromise]);
    return result || "(Commande exécutée avec succès, aucun retour texte)";
  } catch (err) {
    logger.warn(`Erreur RCON [${host}:${port}] -> "${command}": ${err.message}`);
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
    if (rcon) {
      try {
        await rcon.end();
      } catch {
        // Ignorer l'erreur de fermeture de socket
      }
    }
  }
}

module.exports = {
  executeRcon,
  cleanMinecraftColors,
};
