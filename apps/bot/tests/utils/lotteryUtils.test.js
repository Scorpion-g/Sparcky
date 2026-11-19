const test = require("node:test");
const assert = require("node:assert/strict");

const Lottery = require("../../src/models/Lottery");
const User = require("../../src/models/User");
const GuildConfiguration = require("../../src/models/GuildConfiguration");
const {
  getNextSunday20h,
  buyTickets,
  drawLottery,
} = require("../../src/utils/lotteryUtils");

test("getNextSunday20h always returns a Sunday at 20:00", () => {
  const sunday = getNextSunday20h();
  assert.equal(sunday.getDay(), 0);
  assert.equal(sunday.getHours(), 20);
  assert.equal(sunday.getMinutes(), 0);
  assert.ok(sunday.getTime() > Date.now());
});

test("buyTickets deducts balance and adds to jackpot and ticket pool", async () => {
  const origLotteryFindOne = Lottery.findOne;
  const origUserFindOne = User.findOne;

  const fakeLotto = {
    guildId: "gTest",
    ticketPrice: 50,
    jackpot: 100,
    tickets: [{ userId: "otherUser", count: 2 }],
    endTime: new Date(Date.now() + 100000),
    isEnded: false,
    save: async function () { return this; }
  };

  const fakeUser = {
    userId: "buyer1",
    guildId: "gTest",
    balance: 200,
    save: async function () { return this; }
  };

  Lottery.findOne = async () => fakeLotto;
  User.findOne = async () => fakeUser;

  try {
    const res = await buyTickets("buyer1", "gTest", 2);
    assert.equal(res.success, true);
    assert.equal(res.ticketsBought, 2);
    assert.equal(res.cost, 100);
    assert.equal(fakeUser.balance, 100);
    assert.equal(fakeLotto.jackpot, 200);
    assert.equal(fakeLotto.tickets.length, 2);
  } finally {
    Lottery.findOne = origLotteryFindOne;
    User.findOne = origUserFindOne;
  }
});

test("drawLottery picks a winner and awards the jackpot", async () => {
  const origUserFindOneAndUpdate = User.findOneAndUpdate;
  const origGuildConfigFindOne = GuildConfiguration.findOne;

  GuildConfiguration.findOne = () => ({
    lean: async () => ({ lottery: { channelId: null } })
  });

  let creditedWinner = null;
  let creditedAmount = 0;

  User.findOneAndUpdate = async (filter, update) => {
    creditedWinner = filter.userId;
    creditedAmount = update.$inc.balance;
    return {};
  };

  const fakeLotto = {
    _id: "lotto123",
    guildId: "gDraw",
    ticketPrice: 50,
    jackpot: 500,
    tickets: [
      { userId: "playerA", count: 10 },
    ],
    endTime: new Date(),
    isEnded: false,
    history: [],
    save: async function () { return this; }
  };

  Lottery.prototype.save = async function () { return this; };

  const fakeClient = {
    guilds: {
      cache: {
        get: () => ({
          channels: { cache: { get: () => null } },
          members: { fetch: async () => null }
        })
      }
    }
  };

  try {
    const res = await drawLottery(fakeClient, fakeLotto);
    assert.equal(res.success, true);
    assert.equal(res.winnerId, "playerA");
    assert.equal(res.jackpot, 500);
    assert.equal(creditedWinner, "playerA");
    assert.equal(creditedAmount, 500);
    assert.equal(fakeLotto.isEnded, true);
  } finally {
    User.findOneAndUpdate = origUserFindOneAndUpdate;
    GuildConfiguration.findOne = origGuildConfigFindOne;
  }
});
