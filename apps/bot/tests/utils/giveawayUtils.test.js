const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGiveawayEmbed, buildGiveawayButton } = require("../../src/utils/giveawayUtils");

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
