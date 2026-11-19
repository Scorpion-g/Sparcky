const test = require("node:test");
const assert = require("node:assert/strict");

const User = require("../../src/models/User");
const Level = require("../../src/models/Level");
const {
  getUserQuests,
  incrementQuestProgress,
  claimQuestRewards,
  getTodayString,
} = require("../../src/utils/questUtils");

test("getTodayString returns format YYYY-MM-DD", () => {
  const str = getTodayString();
  assert.match(str, /^\d{4}-\d{2}-\d{2}$/);
});

test("getUserQuests generates 3 quests if none exist for today", async () => {
  const origFindOne = User.findOne;
  let savedUser = null;

  User.findOne = async () => null;
  User.prototype.save = async function () {
    savedUser = this;
    return this;
  };

  try {
    const quests = await getUserQuests("u123", "g456");
    assert.equal(quests.date, getTodayString());
    assert.equal(quests.quests.length, 3);
    assert.equal(quests.claimed, false);
    assert.ok(savedUser);
  } finally {
    User.findOne = origFindOne;
  }
});

test("incrementQuestProgress updates quest and marks completed", async () => {
  const origFindOne = User.findOne;
  const today = getTodayString();

  const fakeUser = {
    userId: "u123",
    guildId: "g456",
    dailyQuests: {
      date: today,
      quests: [
        { id: "messages", type: "messages", target: 5, progress: 3, completed: false },
        { id: "coinflip", type: "coinflip", target: 3, progress: 0, completed: false },
      ],
      claimed: false,
    },
    markModified: () => {},
    save: async function () { return this; }
  };

  User.findOne = async () => fakeUser;

  try {
    await incrementQuestProgress("u123", "g456", "messages", 2);
    assert.equal(fakeUser.dailyQuests.quests[0].progress, 5);
    assert.equal(fakeUser.dailyQuests.quests[0].completed, true);
  } finally {
    User.findOne = origFindOne;
  }
});

test("claimQuestRewards credits coins, XP and prevents double claim", async () => {
  const origUserFindOne = User.findOne;
  const origLevelFindOneAndUpdate = Level.findOneAndUpdate;
  const today = getTodayString();

  let levelXpGained = 0;
  Level.findOneAndUpdate = async (filter, update) => {
    levelXpGained += update.$inc.xp;
    return {};
  };

  const fakeUser = {
    userId: "uWinner",
    guildId: "g456",
    balance: 100,
    dailyQuests: {
      date: today,
      quests: [
        { id: "messages", type: "messages", target: 5, progress: 5, completed: true, rewardCoins: 100, rewardXp: 50 },
        { id: "coinflip", type: "coinflip", target: 3, progress: 3, completed: true, rewardCoins: 100, rewardXp: 50 },
        { id: "daily", type: "daily", target: 1, progress: 1, completed: true, rewardCoins: 100, rewardXp: 50 },
      ],
      claimed: false,
    },
    markModified: () => {},
    save: async function () { return this; }
  };

  User.findOne = async () => fakeUser;

  try {
    // All 3 completed: 300 coins * 1.5 = 450, 150 xp * 1.5 = 225
    const res = await claimQuestRewards("uWinner", "g456");
    assert.equal(res.success, true);
    assert.equal(res.allCompleted, true);
    assert.equal(res.totalCoins, 450);
    assert.equal(res.totalXp, 225);
    assert.equal(fakeUser.balance, 550);
    assert.equal(fakeUser.dailyQuests.claimed, true);

    // Second claim attempt should fail
    const res2 = await claimQuestRewards("uWinner", "g456");
    assert.equal(res2.success, false);
    assert.equal(res2.reason, "ALREADY_CLAIMED");
  } finally {
    User.findOne = origUserFindOne;
    Level.findOneAndUpdate = origLevelFindOneAndUpdate;
  }
});
