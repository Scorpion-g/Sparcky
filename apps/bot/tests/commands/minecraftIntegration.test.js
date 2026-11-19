const test = require("node:test");
const assert = require("node:assert/strict");
const linkMcCommand = require("../../src/commands/general/linkmc");
const shopCommand = require("../../src/commands/shop/shop");
const { cleanMinecraftColors } = require("../../src/utils/rcon");

test("link-mc command data structure", () => {
  assert.equal(linkMcCommand.data.name, "link-mc");
  const subcommands = linkMcCommand.data.options.map((o) => o.name);
  assert.ok(subcommands.includes("set"), "Should have 'set' subcommand");
  assert.ok(subcommands.includes("unlink"), "Should have 'unlink' subcommand");
  assert.ok(subcommands.includes("view"), "Should have 'view' subcommand");
});

test("Minecraft username regex validation", () => {
  const MC_REGEX = /^[a-zA-Z0-9_.]{3,16}$/;
  // Valid usernames
  assert.ok(MC_REGEX.test("Notch"));
  assert.ok(MC_REGEX.test("Mattox__"));
  assert.ok(MC_REGEX.test(".BedrockUser"));
  assert.ok(MC_REGEX.test("Scorpion_2026"));

  // Invalid / malicious inputs (injection prevention)
  assert.ok(!MC_REGEX.test("ab")); // too short
  assert.ok(!MC_REGEX.test("ToolongUsernameHere123")); // too long
  assert.ok(!MC_REGEX.test("Notch; op player")); // semicolon injection
  assert.ok(!MC_REGEX.test("Notch\ngive Notch diamond")); // newline injection
  assert.ok(!MC_REGEX.test("Steve 123")); // space injection
  assert.ok(!MC_REGEX.test("Steve\"")); // quote injection
  assert.ok(!MC_REGEX.test("Steve'")); // single quote injection
  assert.ok(!MC_REGEX.test("Steve/")); // slash injection
});

test("shop command supports minecraft type and command option", () => {
  assert.equal(shopCommand.data.name, "shop");
  const addSub = shopCommand.data.options.find((o) => o.name === "add");
  assert.ok(addSub, "Should have 'add' subcommand");

  const typeOpt = addSub.options.find((o) => o.name === "type");
  assert.ok(typeOpt, "Should have 'type' option");
  const typeValues = typeOpt.choices.map((c) => c.value);
  assert.ok(typeValues.includes("minecraft"), "Choices should include 'minecraft'");

  const cmdOpt = addSub.options.find((o) => o.name === "command");
  assert.ok(cmdOpt, "Should have 'command' option");
});

test("cleanMinecraftColors strips color codes correctly", () => {
  const raw = "§aGave 10 [Diamond] to §6Mattox__§r";
  const cleaned = cleanMinecraftColors(raw);
  assert.equal(cleaned, "Gave 10 [Diamond] to Mattox__");
});

test("Minecraft command template replacement", () => {
  const template = "give {player} diamond 10";
  const username = "Mattox__";
  const result = template.replace(/\{player\}/gi, username);
  assert.equal(result, "give Mattox__ diamond 10");
});
