const { Schema, model } = require('mongoose');

const userSchema = new Schema({
	userId: {
		type: String,
		required: true,
	},
	guildId: {
		type: String,
		required: true,
	},
	balance: {
		type: Number,
		default: 0,
	},
	lastDaily: {
		type: Date,
		default: null,
	},
	lastWork: {
		type: Date,
		default: null,
	},
	lastRob: {
		type: Date,
		default: null,
	},
	lastVote: {
		type: Date,
		default: null,
	},
  lastCoinflip: {
    type: Date,
    default: null,
  },
  items: {
    type: [String],
    default: []
  },
  reputation: {
    type: Number,
    default: 0
  },
  lastRep: {
    type: Date,
    default: null
  },
  dailyQuests: {
    date: { type: String, default: null },
    quests: { type: Array, default: [] },
    claimed: { type: Boolean, default: false }
  },
  minecraftUsername: {
    type: String,
    default: null,
    trim: true,
  },
  minecraftLinkedAt: {
    type: Date,
    default: null,
  }
});

module.exports = model('User', userSchema);
