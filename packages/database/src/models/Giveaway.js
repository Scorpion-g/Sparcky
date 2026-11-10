const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      default: null,
    },
    endTime: {
      type: Date,
      required: true,
    },
    prize: {
      type: String,
      required: true,
    },
    winnersCount: {
      type: Number,
      required: true,
      default: 1,
    },
    participants: {
      type: [String], // Array of user IDs
      default: [],
    },
    winners: {
      type: [String], // Array of winning user IDs
      default: [],
    },
    hostedBy: {
      type: String,
      default: null,
    },
    isEnded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Giveaway', giveawaySchema, 'Giveaways');
