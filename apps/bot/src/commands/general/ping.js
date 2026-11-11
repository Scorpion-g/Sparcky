const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

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

    const clientId =
      client?.user?.id || process.env.CLIENT_ID || "1275197373580050604";
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Inviter Sparcky")
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`,
        )
        .setEmoji("➕"),
      new ButtonBuilder()
        .setLabel("Dashboard Web")
        .setStyle(ButtonStyle.Link)
        .setURL("https://sparcky.matteoriviere.fr")
        .setEmoji("🌐"),
    );

    await interaction.editReply({
      content: await interaction.t("MISC.PING.PONG", { latency, apiLatency }),
      components: [row],
    });
  },
};
