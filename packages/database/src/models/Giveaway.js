const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
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
  },
  participants: {
    type: [String], // Array of user IDs
    default: [],
  },
  isEnded: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Giveaway', giveawaySchema, 'Giveaways');
