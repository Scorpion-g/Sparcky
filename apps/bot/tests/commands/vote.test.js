const test = require("node:test");
const assert = require("node:assert/strict");
const GuildConfiguration = require("../../src/models/GuildConfiguration");
const User = require("../../src/models/User");
const voteCmd = require("../../src/commands/economy/vote");
const bumpCmd = require("../../src/commands/economy/bump");

test("vote and bump command definitions are valid", () => {
  assert.equal(voteCmd.data.name, "vote");
  assert.equal(bumpCmd.data.name, "bump");
  const jsonVote = voteCmd.data.toJSON();
  const jsonBump = bumpCmd.data.toJSON();
  assert.ok(jsonVote.description, "Vote must have description");
  assert.ok(jsonBump.description, "Bump must have description");
});

test("vote command rejects DM executions", async () => {
  let replied = null;
  const interaction = {
    inGuild: () => false,
    t: async () => "Guild only",
    reply: async (obj) => {
      replied = obj;
    },
  };

  await voteCmd.execute(interaction);
  assert.ok(replied);
  assert.equal(replied.ephemeral, true);
});

test("vote command generates embed and buttons properly", async () => {
  const origGuildFindOne = GuildConfiguration.findOne;
  const origUserFindOne = User.findOne;

  GuildConfiguration.findOne = () => ({
    lean: async () => ({ economyEnabled: true, currencySymbol: "🪙" }),
  });
  User.findOne = async () => ({
    userId: "user-456",
    guildId: "fake-guild-456",
    lastVote: null,
  });

  try {
    let replyObj = null;
    let deferred = false;

    const interaction = {
      inGuild: () => true,
      guild: { id: "fake-guild-456" },
      user: {
        id: "user-456",
        username: "testuser",
        displayAvatarURL: () => null,
      },
      client: {
        user: { id: "1275197373580050604" },
      },
      deferReply: async () => {
        deferred = true;
      },
      editReply: async (obj) => {
        replyObj = obj;
        return {
          createMessageComponentCollector: () => ({
            on: () => {},
            stop: () => {},
          }),
        };
      },
    };

    await voteCmd.execute(interaction);

    assert.equal(deferred, true);
    assert.ok(replyObj);
    assert.ok(replyObj.embeds && replyObj.embeds.length === 1);
    assert.ok(replyObj.components && replyObj.components.length === 1);

    const embed = replyObj.embeds[0].data;
    assert.ok(embed.title.includes("Sparcky sur Top.gg"));
    assert.ok(embed.description.includes("1000"));
    assert.ok(embed.description.includes("🪙"));
  } finally {
    GuildConfiguration.findOne = origGuildFindOne;
    User.findOne = origUserFindOne;
  }
});
