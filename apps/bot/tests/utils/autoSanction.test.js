const test = require("node:test");
const assert = require("node:assert/strict");

const GuildConfiguration = require("../../src/models/GuildConfiguration");
const { checkAndSanction } = require("../../src/utils/autoSanction");

function buildMember({
  canModerate = true,
  kickable = true,
  bannable = true,
  hasTextLogChannel = true,
} = {}) {
  const sent = [];
  const logChannel = hasTextLogChannel
    ? { isTextBased: () => true, send: (payload) => sent.push(payload) }
    : null;

  const member = {
    id: "user-1",
    user: { tag: "user#0001" },
    kickable,
    bannable,
    timeoutCalls: [],
    kickCalls: [],
    banCalls: [],
    timeout(ms, reason) {
      this.timeoutCalls.push({ ms, reason });
      return Promise.resolve();
    },
    kick(reason) {
      this.kickCalls.push(reason);
      return Promise.resolve();
    },
    ban(payload) {
      this.banCalls.push(payload);
      return Promise.resolve();
    },
    guild: {
      id: "guild-1",
      members: {
        me: {
          permissions: {
            has: () => canModerate,
          },
        },
      },
      channels: {
        cache: {
          get: () => logChannel,
        },
      },
    },
  };

  return { member, sent };
}

test("applies timeout on 3 warns when auto-sanction is enabled", async () => {
  const originalFindOne = GuildConfiguration.findOne;
  GuildConfiguration.findOne = () => ({
    lean: async () => ({
      autoSanction: true,
      modLogChannel: "log-1",
      language: "fr",
    }),
  });

  try {
    const { member, sent } = buildMember();
    await checkAndSanction(member, 3);

    assert.equal(member.timeoutCalls.length, 1);
    assert.equal(member.timeoutCalls[0].ms, 10 * 60 * 1000);
    assert.equal(member.kickCalls.length, 0);
    assert.equal(member.banCalls.length, 0);
    assert.equal(sent.length, 1);
  } finally {
    GuildConfiguration.findOne = originalFindOne;
  }
});

test("applies kick on 5 warns and ban on 7 warns", async () => {
  const originalFindOne = GuildConfiguration.findOne;
  GuildConfiguration.findOne = () => ({
    lean: async () => ({
      autoSanction: true,
      modLogChannel: "log-1",
      language: "fr",
    }),
  });

  try {
    const { member } = buildMember();
    await checkAndSanction(member, 5);
    await checkAndSanction(member, 7);

    assert.equal(member.kickCalls.length, 1);
    assert.equal(member.banCalls.length, 1);
  } finally {
    GuildConfiguration.findOne = originalFindOne;
  }
});

test("does nothing when warn threshold is not reached", async () => {
  const originalFindOne = GuildConfiguration.findOne;
  GuildConfiguration.findOne = () => ({
    lean: async () => ({
      autoSanction: true,
      modLogChannel: "log-1",
      language: "fr",
    }),
  });

  try {
    const { member, sent } = buildMember();
    await checkAndSanction(member, 4);

    assert.equal(member.timeoutCalls.length, 0);
    assert.equal(member.kickCalls.length, 0);
    assert.equal(member.banCalls.length, 0);
    assert.equal(sent.length, 0);
  } finally {
    GuildConfiguration.findOne = originalFindOne;
  }
});
