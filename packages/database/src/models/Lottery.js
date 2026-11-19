const mongoose = require("mongoose");

const lotterySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ticketPrice: { type: Number, default: 50 },
  jackpot: { type: Number, default: 0 },
  tickets: [
    {
      userId: { type: String, required: true },
      count: { type: Number, default: 1 }
    }
  ],
  endTime: { type: Date, required: true },
  isEnded: { type: Boolean, default: false },
  winnerId: { type: String, default: null },
  history: [
    {
      winnerId: String,
      jackpot: Number,
      ticketCount: Number,
      endedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Lottery", lotterySchema, "Lotteries");
