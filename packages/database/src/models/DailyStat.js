const mongoose = require('mongoose');

const dailyStatSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: String, // Format: "YYYY-MM-DD"
      required: true,
      index: true
    },
    messages: {
      type: Number,
      default: 0
    },
    joins: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

dailyStatSchema.index({ guildId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyStat', dailyStatSchema, 'dailystats');
