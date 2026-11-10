const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Retourne votre ping")
    .setDescriptionLocalizations({
      fr: "Retourne votre ping",
      "en-US": "Returns your ping",
    }),

  async execute(interaction, client) {
    const sent = await interaction.reply({
      content: await interaction.t("MISC.PING.CALCULATING"),
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    await interaction.editReply(
      await interaction.t("MISC.PING.PONG", { latency, apiLatency }),
    );
  },
};
