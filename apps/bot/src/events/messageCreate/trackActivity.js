const DailyStat = require("../../models/DailyStat");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild || message.author?.bot) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      await DailyStat.updateOne(
        { guildId: message.guild.id, date: today },
        { $inc: { messages: 1 } },
        { upsert: true }
      );
    } catch {
      // Silencieux pour ne pas impacter les performances de chat
    }
  }
};
