const fs = require("fs");
const path = require("path");

/**
 * Charge toutes les commandes locales
 * et leur ajoute automatiquement une catégorie
 * basée sur le nom du dossier parent.
 */
module.exports = (dirsPath = path.join(__dirname, "..", "commands")) => {
  const commands = [];

  // Parcours des sous-dossiers (ex: moderation, utiles, economy)
  const categories = fs.readdirSync(dirsPath);

  for (const category of categories) {
    const commandsPath = path.join(dirsPath, category);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      // Ajout automatique de la catégorie si elle n’est pas définie
      command.category = command.category || category.charAt(0).toUpperCase() + category.slice(1);

      commands.push(command);
    }
  }

  return commands;
};

