const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildGiveawayEmbed,
  buildGiveawayButton,
  buildWinnerAnnouncement,
  distributeGiveawayRewards,
  handleGiveawayButton
} = require("../../src/utils/giveawayUtils");
const Giveaway = require("../../src/models/Giveaway");
const User = require("../../src/models/User");
const Level = require("../../src/models/Level");

test("buildGiveawayEmbed builds correct embed for active giveaway", () => {
  const giveaway = {
    _id: "test12345",
    prize: "Discord Nitro 1 Mois",
    endTime: new Date(Date.now() + 3600000),
    winnersCount: 2,
    participants: ["user1", "user2"],
    hostedBy: "host123",
  };

  const embed = buildGiveawayEmbed(giveaway, false);
  assert.equal(embed.data.title, "🎉 GIVEAWAY : Discord Nitro 1 Mois");
  assert.ok(embed.data.description.includes("Discord Nitro 1 Mois"));
  assert.ok(embed.data.description.includes("`2`"));
  assert.ok(embed.data.footer.text.includes("test12345"));
});

test("buildGiveawayEmbed builds correct embed for ended giveaway with winners", () => {
  const giveaway = {
    _id: "test67890",
    prize: "100k Coins",
    endTime: new Date(Date.now() - 1000),
    winnersCount: 1,
    participants: ["user1", "user2"],
    winners: ["user1"],
  };

  const embed = buildGiveawayEmbed(giveaway, true, ["user1"]);
  assert.ok(embed.data.description.includes("terminé"));
  assert.ok(embed.data.description.includes("<@user1>"));
});

test("buildGiveawayEmbed includes reward details for coins, xp, and role", () => {
  const coinsGw = {
    _id: "gwCoins",
    prize: "5,000 Pièces",
    rewardType: "coins",
    rewardAmount: 5000,
    endTime: new Date(Date.now() + 3600000),
    winnersCount: 1,
    participants: []
  };
  const coinsEmbed = buildGiveawayEmbed(coinsGw, false);
  assert.ok(coinsEmbed.data.description.includes("+5000 pièces"));

  const xpGw = {
    _id: "gwXp",
    prize: "2,500 XP",
    rewardType: "xp",
    rewardAmount: 2500,
    endTime: new Date(Date.now() + 3600000),
    winnersCount: 1,
    participants: []
  };
  const xpEmbed = buildGiveawayEmbed(xpGw, false);
  assert.ok(xpEmbed.data.description.includes("+2500 XP"));

  const roleGw = {
    _id: "gwRole",
    prize: "Rôle VIP",
    rewardType: "role",
    rewardRoleId: "role123",
    endTime: new Date(Date.now() + 3600000),
    winnersCount: 1,
    participants: []
  };
  const roleEmbed = buildGiveawayEmbed(roleGw, false);
  assert.ok(roleEmbed.data.description.includes("<@&role123>"));
});

test("buildGiveawayButton generates active and disabled buttons", () => {
  const activeGiveaway = {
    _id: "gw1",
    participants: ["u1", "u2", "u3"],
  };

  const activeRow = buildGiveawayButton(activeGiveaway, false);
  const activeBtn = activeRow.components[0];
  assert.equal(activeBtn.data.custom_id, "giveaway_join_gw1");
  assert.equal(activeBtn.data.label, "Participer (3)");
  assert.equal(activeBtn.data.disabled, undefined);

  const endedRow = buildGiveawayButton(activeGiveaway, true);
  const endedBtn = endedRow.components[0];
  assert.equal(endedBtn.data.custom_id, "giveaway_ended_gw1");
  assert.equal(endedBtn.data.label, "Terminé (3 participants)");
  assert.equal(endedBtn.data.disabled, true);
});

test("buildWinnerAnnouncement formats announcement per reward type", () => {
  const noWinners = buildWinnerAnnouncement({ prize: "Mega Nitro" }, []);
  assert.ok(noWinners.includes("Aucun gagnant"));

  const coinsAnnounce = buildWinnerAnnouncement(
    { prize: "5000 Coins", rewardType: "coins", rewardAmount: 5000 },
    ["user1", "user2"]
  );
  assert.ok(coinsAnnounce.includes("<@user1>, <@user2>"));
  assert.ok(coinsAnnounce.includes("+5000 pièces"));

  const xpAnnounce = buildWinnerAnnouncement(
    { prize: "2500 XP", rewardType: "xp", rewardAmount: 2500 },
    ["user1"]
  );
  assert.ok(xpAnnounce.includes("+2500 points d'XP"));

  const roleAnnounce = buildWinnerAnnouncement(
    { prize: "Rôle VIP", rewardType: "role", rewardRoleId: "role888" },
    ["user1"]
  );
  assert.ok(roleAnnounce.includes("<@&role888>"));

  const otherAnnounce = buildWinnerAnnouncement(
    { prize: "Discord Nitro", rewardType: "other" },
    ["user1"]
  );
  assert.ok(otherAnnounce.includes("Discord Nitro"));
});

test("distributeGiveawayRewards handles coins, xp and roles correctly", async () => {
  const origUserFindOneAndUpdate = User.findOneAndUpdate;
  const origLevelFindOneAndUpdate = Level.findOneAndUpdate;

  const userUpdates = [];
  User.findOneAndUpdate = async (filter, update) => {
    userUpdates.push({ filter, update });
    return {};
  };

  const levelUpdates = [];
  Level.findOneAndUpdate = async (filter, update) => {
    levelUpdates.push({ filter, update });
    return {};
  };

  const addedRoles = [];
  const fakeMember = {
    roles: {
      add: async (roleId) => {
        addedRoles.push(roleId);
      }
    }
  };

  const fakeClient = {
    guilds: {
      cache: {
        get: () => ({
          members: {
            fetch: async () => fakeMember
          }
        })
      }
    }
  };

  try {
    // 1. Coins
    await distributeGiveawayRewards(
      fakeClient,
      { guildId: "guild1", rewardType: "coins", rewardAmount: 2000 },
      ["u1", "u2"]
    );
    assert.equal(userUpdates.length, 2);
    assert.equal(userUpdates[0].update.$inc.balance, 2000);

    // 2. XP
    await distributeGiveawayRewards(
      fakeClient,
      { guildId: "guild1", rewardType: "xp", rewardAmount: 1500 },
      ["u3"]
    );
    assert.equal(levelUpdates.length, 1);
    assert.equal(levelUpdates[0].update.$inc.xp, 1500);

    // 3. Role
    await distributeGiveawayRewards(
      fakeClient,
      { guildId: "guild1", rewardType: "role", rewardRoleId: "roleSpecial" },
      ["u4"]
    );
    assert.equal(addedRoles.length, 1);
    assert.equal(addedRoles[0], "roleSpecial");

    // 4. Role - Winner higher than bot (Manual assignment required)
    const higherMember = {
      id: "uOwner",
      roles: {
        highest: { position: 100 },
        add: async () => { throw new Error("Hierarchy error"); }
      }
    };
    const clientWithBot = {
      guilds: {
        cache: {
          get: () => ({
            ownerId: "uOwner",
            members: {
              me: { roles: { highest: { position: 20 } } },
              fetch: async () => higherMember
            },
            roles: {
              cache: { get: () => ({ position: 10, name: "VIP" }) }
            }
          })
        }
      }
    };

    const res = await distributeGiveawayRewards(
      clientWithBot,
      { guildId: "guild1", rewardType: "role", rewardRoleId: "roleVip" },
      ["uOwner"]
    );
    assert.deepEqual(res.manualRoleWinners, ["uOwner"]);

    const staffAnnounce = buildWinnerAnnouncement(
      { prize: "Rôle VIP", rewardType: "role", rewardRoleId: "roleVip" },
      ["uOwner"],
      res.manualRoleWinners
    );
    assert.ok(staffAnnounce.includes("Note Staff"));
    assert.ok(staffAnnounce.includes("<@uOwner>"));
  } finally {
    User.findOneAndUpdate = origUserFindOneAndUpdate;
    Level.findOneAndUpdate = origLevelFindOneAndUpdate;
  }
});

test("handleGiveawayButton handles both giveaway_join_ and giveaway_enter_ prefixes with deferReply", async () => {
  const origFindById = Giveaway.findById;
  const origFindByIdAndUpdate = Giveaway.findByIdAndUpdate;

  const validGwId = "507f1f77bcf86cd799439011";
  const fakeDoc = {
    _id: validGwId,
    prize: "Épée Légendaire",
    isEnded: false,
    participants: [],
  };

  Giveaway.findById = async (id) => {
    assert.equal(id, validGwId);
    return { ...fakeDoc };
  };

  Giveaway.findByIdAndUpdate = async (id, update) => {
    assert.equal(id, validGwId);
    if (update.$addToSet) {
      fakeDoc.participants.push(update.$addToSet.participants);
    }
    return { ...fakeDoc };
  };

  let deferred = false;
  let replyContent = "";

  const fakeInteraction = {
    customId: `giveaway_enter_${validGwId}`,
    user: { id: "userAboveBot" },
    deferReply: async ({ ephemeral }) => {
      assert.equal(ephemeral, true);
      deferred = true;
    },
    deferred: true,
    editReply: async ({ content }) => {
      replyContent = content;
    },
    message: {
      edit: async () => {}
    }
  };

  try {
    await handleGiveawayButton(fakeInteraction);
    assert.equal(deferred, true);
    assert.ok(replyContent.includes("Félicitations"));
    assert.ok(fakeDoc.participants.includes("userAboveBot"));
  } finally {
    Giveaway.findById = origFindById;
    Giveaway.findByIdAndUpdate = origFindByIdAndUpdate;
  }
});
