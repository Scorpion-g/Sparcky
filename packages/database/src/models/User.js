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
		reqired: true,
	},
  items: {
    type: [String],
    default: []
  }
});

module.exports = model('User', userSchema);
