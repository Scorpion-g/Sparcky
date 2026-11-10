const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    supportRoleId: { type: String, required: true },
    ticketCategoryId: { type: String, required: true },
    logChannelId: { type: String, required: true },
    ticketTypes: { type: [String], required: true },
});

module.exports = mongoose.model('TicketSettings', ticketSchema);
