const getLocalCommands = require("../src/utils/getLocalCommands");

const name = process.argv[2];
const localCommands = getLocalCommands();

if (!name) {
  console.log("Usage: node scripts/debug-command-localizations.js <commandName>");
  console.log("Available commands:");
  for (const c of localCommands) {
    const json = c.data.toJSON();
    console.log(`- ${json.name}`);
  }
  process.exit(1);
}

const cmd = localCommands.find(
  (c) => c.data?.name === name || c.data?.toJSON?.().name === name,
);

if (!cmd) {
  console.log(`Command not found: ${name}`);
  console.log("Available commands:");
  for (const c of localCommands) {
    const json = c.data.toJSON();
    console.log(`- ${json.name}`);
  }
  process.exit(1);
}

const json = cmd.data.toJSON();
console.log(JSON.stringify(json, null, 2));

