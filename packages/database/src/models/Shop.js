const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  itemId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    default: -1, // -1 indicates unlimited stock
  },
  type: {
    type: String,
    required: true,
    enum: ['role', 'item', 'other'], // Example types
  },
});

module.exports = mongoose.model('ShopItem', shopItemSchema);
