const test = require("node:test");
const assert = require("node:assert/strict");
const GuildConfiguration = require("../../src/models/GuildConfiguration");
const User = require("../../src/models/User");
const moneyCmd = require("../../src/commands/economy/balance");

test("money command definition is valid", () => {
  assert.equal(moneyCmd.data.name, "money");
  const json = moneyCmd.data.toJSON();
  assert.ok(json.description, "Must have description");
  assert.equal(json.options?.length, 1);
  assert.equal(json.options[0].name, "user");
});

test("money command rejects DM executions", async () => {
  let replied = null;
  const interaction = {
    inGuild: () => false,
    t: async () => "Guild only",
    reply: async (obj) => { replied = obj; }
  };

  await moneyCmd.execute(interaction);
  assert.ok(replied);
  assert.equal(replied.ephemeral, true);
});

test("money command formats embed properly for self", async () => {
  const origGuildFindOne = GuildConfiguration.findOne;
  const origUserFindOne = User.findOne;

  GuildConfiguration.findOne = () => ({
    lean: async () => ({ economyEnabled: true, currencySymbol: "🪙", currencyName: "SparkyCoins" })
  });
  User.findOne = async () => ({ balance: 1250, items: ["vip_pass"] });

  try {
    let replyObj = null;
    let deferred = false;

    const interaction = {
      inGuild: () => true,
      guild: {
        id: "fake-guild-123",
        members: { fetch: async () => null }
      },
      member: { id: "user-123", displayName: "Scorpion" },
      user: {
        id: "user-123",
        username: "scorpion",
        displayName: "Scorpion",
        displayAvatarURL: () => "https://cdn.discordapp.com/avatars/user-123/avatar.png"
      },
      options: {
        getUser: () => null,
        getMember: () => null,
        get: () => null
      },
      deferReply: async () => { deferred = true; },
      editReply: async (obj) => { replyObj = obj; }
    };

    await moneyCmd.execute(interaction);
    assert.ok(deferred, "Must defer reply");
    assert.ok(replyObj?.embeds?.[0], "Must edit reply with an embed");

    const embedData = replyObj.embeds[0].data;
    assert.equal(embedData.author.name, "Scorpion");
    assert.equal(embedData.author.icon_url, "https://cdn.discordapp.com/avatars/user-123/avatar.png");
    assert.notEqual(embedData.author.icon_url, null, "icon_url must never be null");
    assert.equal(embedData.title, "💰 Solde SparkyCoins");
    assert.ok(embedData.description.includes("Vous possédez actuellement **1250 🪙**"));
    assert.equal(embedData.fields[0].value, "1 article(s)");
  } finally {
    GuildConfiguration.findOne = origGuildFindOne;
    User.findOne = origUserFindOne;
  }
});

test("money command formats embed properly for target member", async () => {
  const origGuildFindOne = GuildConfiguration.findOne;
  const origUserFindOne = User.findOne;

  GuildConfiguration.findOne = () => ({
    lean: async () => ({ economyEnabled: true, currencySymbol: "$", currencyName: "Dollars" })
  });
  User.findOne = async () => ({ balance: 500, items: [] });

  try {
    let replyObj = null;

    const targetUser = {
      id: "target-456",
      username: "targetUser",
      displayName: "Target Member",
      displayAvatarURL: () => "https://cdn.discordapp.com/avatars/target-456/avatar.png"
    };

    const interaction = {
      inGuild: () => true,
      guild: {
        id: "fake-guild-123",
        members: { fetch: async () => null }
      },
      member: { id: "user-123", displayName: "Scorpion" },
      user: {
        id: "user-123",
        username: "scorpion",
        displayName: "Scorpion",
        displayAvatarURL: () => "https://cdn.discordapp.com/avatars/user-123/avatar.png"
      },
      options: {
        getUser: (name) => name === "user" ? targetUser : null,
        getMember: () => null,
        get: (name) => name === "user" ? { value: "target-456" } : null
      },
      deferReply: async () => {},
      editReply: async (obj) => { replyObj = obj; }
    };

    await moneyCmd.execute(interaction);
    assert.ok(replyObj?.embeds?.[0]);

    const embedData = replyObj.embeds[0].data;
    assert.equal(embedData.author.name, "Target Member");
    assert.equal(embedData.author.icon_url, "https://cdn.discordapp.com/avatars/target-456/avatar.png");
    assert.ok(embedData.description.includes("<@target-456> possède actuellement **500 $**"));
  } finally {
    GuildConfiguration.findOne = origGuildFindOne;
    User.findOne = origUserFindOne;
  }
});

test("money command respects economyEnabled = false", async () => {
  const origGuildFindOne = GuildConfiguration.findOne;
  GuildConfiguration.findOne = () => ({
    lean: async () => ({ economyEnabled: false })
  });

  try {
    let replied = null;
    const interaction = {
      inGuild: () => true,
      guild: { id: "fake-guild" },
      reply: async (obj) => { replied = obj; }
    };

    await moneyCmd.execute(interaction);
    assert.ok(replied);
    assert.equal(replied.ephemeral, true);
    assert.ok(replied.content.includes("désactivé"));
  } finally {
    GuildConfiguration.findOne = origGuildFindOne;
  }
});
