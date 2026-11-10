const path = require('path');
const fs = require('fs');
const { SlashCommandBuilder } = require('discord.js');

const commandsPath = path.join(__dirname, 'commands'); // adapte selon ton projet
const commandFolders = fs.readdirSync(commandsPath);

let invalidOptions = [];

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);

    if (!('data' in command)) continue;
    const data = command.data;

    if (!(data instanceof SlashCommandBuilder)) continue;

    try {
      const json = data.toJSON();

      // Vérifie nom et description de la commande
      if (!json.name || json.name.length === 0) {
        invalidOptions.push({ file: filePath, reason: 'Command missing name' });
      }
      if (!json.description || json.description.length === 0) {
        invalidOptions.push({ file: filePath, reason: 'Command missing description' });
      }

      // Vérifie options
      if (json.options && json.options.length > 0) {
        for (const option of json.options) {
          if (!option.name || option.name.length === 0) {
            invalidOptions.push({ file: filePath, option, reason: 'Option missing name' });
          }
          if (!option.description || option.description.length === 0) {
            invalidOptions.push({ file: filePath, option, reason: 'Option missing description' });
          }

          // Vérifie les choices
          if (option.choices && option.choices.length > 0) {
            for (const choice of option.choices) {
              if (!choice.name || choice.name.length === 0) {
                invalidOptions.push({ file: filePath, option, choice, reason: 'Choice missing name' });
              }
              if (choice.value === undefined || choice.value === null) {
                invalidOptions.push({ file: filePath, option, choice, reason: 'Choice missing value' });
              }
            }
          }
        }
      }

    } catch (error) {
      invalidOptions.push({ file: filePath, reason: `toJSON error: ${error.message}` });
    }
  }
}

if (invalidOptions.length === 0) {
  console.log('✅ Toutes les commandes sont valides.');
} else {
  console.log('⚠️ Commandes avec problèmes détectés :');
  invalidOptions.forEach(opt => {
    console.log(`${opt.file} → ${opt.reason}`);
    if (opt.option) console.log(`  Option: ${opt.option.name}`);
    if (opt.choice) console.log(`  Choice: ${opt.choice.name} / value: ${opt.choice.value}`);
  });
}

