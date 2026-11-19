import { Rcon } from "rcon-client"
import { decrypt } from "@sparcky/database"

export function cleanMinecraftColors(str) {
  if (!str || typeof str !== "string") return ""
  return str.replace(/§[0-9a-fk-or]/gi, "").trim()
}

export async function executeRcon({
  host,
  port = 25575,
  password,
  command = "list",
  timeout = 5000
}) {
  if (!host) throw new Error("Hôte RCON manquant")
  if (!password) throw new Error("Mot de passe RCON manquant")

  // Déchiffre le mot de passe si celui-ci est chiffré en BDD
  let plainPassword = password
  const isEncryptedFormat =
    typeof password === "string" && password.split(":").length === 3
  if (isEncryptedFormat) {
    const decrypted = decrypt(password)
    if (!decrypted) {
      throw new Error(
        "Impossible de déchiffrer le mot de passe RCON (clé de chiffrement RCON_SECRET invalide)"
      )
    }
    plainPassword = decrypted
  }

  let rcon = null
  let timer = null

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Timeout RCON (${timeout}ms)`))
      }, timeout)
    })

    const executionPromise = (async () => {
      rcon = await Rcon.connect({
        host,
        port: Number(port) || 25575,
        password: plainPassword,
        timeout
      })

      const response = await rcon.send(command)
      return cleanMinecraftColors(response)
    })()

    const result = await Promise.race([executionPromise, timeoutPromise])
    return result || "(Succès sans retour)"
  } finally {
    if (timer) clearTimeout(timer)
    if (rcon) {
      try {
        await rcon.end()
      } catch {
        // Ignorer
      }
    }
  }
}
