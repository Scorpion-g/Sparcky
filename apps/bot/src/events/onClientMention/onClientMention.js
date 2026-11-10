const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { t } = require("../../utils/t");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // Vérifie si le bot est mentionné
    if (!message.mentions.has(client.user)) return;

    // Générer la liste des commandes
    const commandList = [...client.commands.values()].map(
      (cmd) => `- \`${cmd.data.name}\`: ${cmd.data.description}`,
    );
    let commandListString = commandList.join("\n");

    // Tronquer si trop long pour Discord
    if (commandListString.length > 1024) {
      commandListString = commandListString.substring(0, 1021) + "...";
    }

    // Construire l'embed (i18n)
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(
        await t(message, "MENTION.TITLE", { username: message.author.username }),
      )
      .setDescription(await t(message, "MENTION.DESCRIPTION"))
      .addFields(
        {
          name: await t(message, "MENTION.COMMANDS.TITLE"),
          value: commandListString || (await t(message, "MENTION.COMMANDS.EMPTY")),
        },
        {
          name: await t(message, "MENTION.INVITE.TITLE"),
          value: await t(message, "MENTION.INVITE.VALUE", {
            clientId: process.env.CLIENT_ID,
          }),
        },
        {
          name: await t(message, "MENTION.SUPPORT.TITLE"),
          value: await t(message, "MENTION.SUPPORT.VALUE"),
        },
      )
      .setTimestamp()
      .setFooter({ text: await t(message, "MENTION.FOOTER") });

    // Vérifie les permissions du bot avant d’envoyer
    const botMember = await message.guild.members.fetch(client.user.id);
    if (
      !message.channel
        .permissionsFor(botMember)
        .has([
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
        ])
    ) {
      console.warn(
        `Pas la permission d'envoyer des messages ou des embeds dans ${message.channel.name}`,
      );
      return;
    }

    // Envoi sécurisé de l'embed
    try {
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Erreur lors de l’envoi de l’embed:", error);
    }
  },
};
