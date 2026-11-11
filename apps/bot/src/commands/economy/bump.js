const { SlashCommandBuilder } = require("discord.js");
const voteCommand = require("./vote");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bump")
    .setDescription("Soutenir Sparcky sur Top.gg et récupérer vos récompenses (alias de /vote).")
    .setDescriptionLocalizations({
      "en-US": "Support Sparcky on Top.gg and claim your rewards (alias for /vote).",
    }),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    return voteCommand.execute(interaction);
  },
};
