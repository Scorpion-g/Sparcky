const test = require("node:test");
const assert = require("node:assert/strict");
const duelCommand = require("../../src/commands/economy/duel");

test("duel command data definition is valid", () => {
  assert.equal(duelCommand.data.name, "duel");
  assert.equal(duelCommand.data.options.length, 3);
  assert.equal(duelCommand.data.options[0].name, "adversaire");
  assert.equal(duelCommand.data.options[1].name, "mise");
});

test("duel command rejects self-duel and bot-duel", async () => {
  let replyContent = "";
  const fakeSelfInteraction = {
    inGuild: () => true,
    guild: { id: "g1" },
    user: { id: "userA" },
    options: {
      getUser: () => ({ id: "userA", bot: false }),
      getInteger: () => 100,
      getString: () => "dice",
    },
    reply: async ({ content }) => { replyContent = content; }
  };

  await duelCommand.execute(fakeSelfInteraction);
  assert.ok(replyContent.includes("vous-même"));

  const fakeBotInteraction = {
    inGuild: () => true,
    guild: { id: "g1" },
    user: { id: "userA" },
    options: {
      getUser: () => ({ id: "botB", bot: true }),
      getInteger: () => 100,
      getString: () => "dice",
    },
    reply: async ({ content }) => { replyContent = content; }
  };

  await duelCommand.execute(fakeBotInteraction);
  assert.ok(replyContent.includes("bot"));
});
