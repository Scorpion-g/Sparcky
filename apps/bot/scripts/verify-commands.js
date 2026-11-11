#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const { SlashCommandBuilder, ContextMenuCommandBuilder } = require("discord.js");
const getLocalCommands = require("../src/utils/getLocalCommands");

console.log("\n=======================================================");
console.log(" 🧪 VÉRIFICATION AUTOMATIQUE DES COMMANDES DU BOT");
console.log("=======================================================\n");

let errors = 0;
let checked = 0;

try {
  const commands = getLocalCommands();
  console.log(`🔍 ${commands.length} commandes détectées localement.\n`);

  for (const cmd of commands) {
    checked++;
    const name = cmd.data?.name || "inconnue";

    // 1. Validation de la structure de base
    if (!cmd.data) {
      console.error(`❌ [${name}] : Propriété 'data' manquante.`);
      errors++;
      continue;
    }

    if (typeof cmd.execute !== "function") {
      console.error(`❌ [${name}] : Méthode 'execute' manquante.`);
      errors++;
      continue;
    }

    // 2. Validation du builder Discord
    try {
      const json = cmd.data.toJSON();

      if (!json.name || !/^[a-z0-9_-]{1,32}$/.test(json.name)) {
        console.error(`❌ [${name}] : Nom Discord invalide (doit être minuscule sans espace/accents, max 32 car).`);
        errors++;
        continue;
      }

      if (cmd.data instanceof SlashCommandBuilder && !json.description) {
        console.error(`❌ [${name}] : Description manquante.`);
        errors++;
        continue;
      }

      // 3. Vérification des options
      if (json.options && Array.isArray(json.options)) {
        let hasOptional = false;
        for (const opt of json.options) {
          if (!opt.name || !opt.description) {
            console.error(`❌ [${name}] -> Option '${opt.name}' : Nom ou description manquante.`);
            errors++;
          }
          if (opt.required) {
            if (hasOptional) {
              console.error(`❌ [${name}] -> Option requise '${opt.name}' placée après une option optionnelle.`);
              errors++;
            }
          } else {
            hasOptional = true;
          }
        }
      }

      console.log(`  ✅ /${name.padEnd(16)} [${json.description?.slice(0, 45) || "Menu contextuel"}...]`);
    } catch (err) {
      console.error(`❌ [${name}] : Erreur sérialisation toJSON(): ${err.message}`);
      errors++;
    }
  }

  console.log("\n-------------------------------------------------------");
  if (errors === 0) {
    console.log(`🎉 SUCCÈS : Les ${checked} commandes sont syntaxiquement valides et prêtes pour Discord !`);
    console.log("-------------------------------------------------------\n");
    process.exit(0);
  } else {
    console.error(`⚠️ ÉCHEC : ${errors} erreur(s) détectée(s) sur ${checked} commandes.`);
    console.log("-------------------------------------------------------\n");
    process.exit(1);
  }
} catch (e) {
  console.error("Erreur fatale lors de la vérification :", e);
  process.exit(1);
}
