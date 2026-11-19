const test = require("node:test");
const assert = require("node:assert/strict");
const repCommand = require("../../src/commands/economy/rep");

test("rep command data definition is valid", () => {
  assert.equal(repCommand.data.name, "rep");
  assert.equal(repCommand.data.options.length, 2);
  assert.equal(repCommand.data.options[0].name, "membre");
  assert.equal(repCommand.data.options[0].required, true);
});

test("rep command rejects self-rep and bot-rep", async () => {
  let replyContent = "";
  const fakeSelfInteraction = {
    inGuild: () => true,
    guild: { id: "g1" },
    user: { id: "userA" },
    options: {
      getUser: () => ({ id: "userA", bot: false }),
      getString: () => "Merci pour tout !",
    },
    reply: async ({ content }) => { replyContent = content; }
  };

  await repCommand.execute(fakeSelfInteraction);
  assert.ok(replyContent.includes("vous-même"));

  const fakeBotInteraction = {
    inGuild: () => true,
    guild: { id: "g1" },
    user: { id: "userA" },
    options: {
      getUser: () => ({ id: "botB", bot: true }),
      getString: () => "Merci bot !",
    },
    reply: async ({ content }) => { replyContent = content; }
  };

  await repCommand.execute(fakeBotInteraction);
  assert.ok(replyContent.includes("bots"));
});
