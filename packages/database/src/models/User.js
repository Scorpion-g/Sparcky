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
  items: {
    type: [String],
    default: []
  }
});

module.exports = model('User', userSchema);
