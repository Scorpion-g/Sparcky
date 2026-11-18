const { checkTriviaAnswer } = require("../../utils/qotdTrivia");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild || message.author.bot) return;

    try {
      await checkTriviaAnswer(message);
    } catch (err) {
      console.error("Erreur dans qotdAnswer event:", err);
    }
  }
};
