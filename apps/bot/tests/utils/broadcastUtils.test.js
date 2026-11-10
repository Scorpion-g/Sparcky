const test = require("node:test");
const assert = require("node:assert/strict");
const { PermissionFlagsBits } = require("discord.js");
const { findTargetChannel } = require("../../src/utils/broadcastUtils");

test("findTargetChannel selects discussion channel and rejects unicode-styled reglement", () => {
  const me = {};
  const channelsMap = new Map();

  const reglement = {
    id: "ch-reglement",
    name: "⚖️・𝗥𝗲̀𝗴𝗹𝗲𝗺𝗲𝗻𝘁",
    isTextBased: () => true,
    isVoiceBased: () => false,
    permissionsFor: () => ({
      has: () => true
    })
  };

  const discussion = {
    id: "ch-discussion",
    name: "💬・𝗗𝗶𝘀𝗰𝘂𝘀𝘀𝗶𝗼𝗻",
    isTextBased: () => true,
    isVoiceBased: () => false,
    permissionsFor: () => ({
      has: () => true
    })
  };

  channelsMap.set(reglement.id, reglement);
  channelsMap.set(discussion.id, discussion);

  const guild = {
    members: { me },
    systemChannel: null,
    publicUpdatesChannel: null,
    channels: {
      cache: {
        get: (id) => channelsMap.get(id),
        find: (fn) => Array.from(channelsMap.values()).find(fn)
      }
    }
  };

  const selected = findTargetChannel(guild, {});
  assert.equal(selected?.id, "ch-discussion", "Must choose discussion channel instead of reglement");
});

test("findTargetChannel respects explicit announcementChannel configuration", () => {
  const me = {};
  const custom = {
    id: "ch-custom-news",
    name: "mes-news",
    isTextBased: () => true,
    isVoiceBased: () => false,
    permissionsFor: () => ({
      has: () => true
    })
  };

  const guild = {
    members: { me },
    channels: {
      cache: {
        get: (id) => (id === custom.id ? custom : null),
        find: () => null
      }
    }
  };

  const selected = findTargetChannel(guild, { announcementChannel: "ch-custom-news" });
  assert.equal(selected?.id, "ch-custom-news");
});
