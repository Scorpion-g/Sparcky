const { EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const TicketSettings = require("../../models/Ticket");
const { attachT } = require("../../utils/t");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    attachT(interaction);

    const guild = interaction.guild;
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "ticket_menu") return;

    const selectedType = interaction.values[0];
    const ticketSettings = await TicketSettings.findOne({ guildId: guild.id });
    if (!ticketSettings) {
      return interaction.reply({
        content: await interaction.t("TICKET.NOT_CONFIGURED"),
        ephemeral: true,
      });
    }

    const supportRoleId = ticketSettings.supportRoleId;
    const ticketCategoryId = ticketSettings.ticketCategoryId;

    const existingChannel = guild.channels.cache.find(
      (channel) =>
        channel.name === `ticket-${interaction.user.username}` &&
        channel.parentId === ticketCategoryId,
    );
    if (existingChannel) {
      return interaction.reply({
        content: await interaction.t("TICKET.ALREADY_OPEN", {
          channel: `${existingChannel}`,
        }),
        ephemeral: true,
      });
    }

    const permissions = [
      {
        id: guild.roles.everyone,
        deny: ["ViewChannel"],
      },
      {
        id: interaction.user.id,
        allow: [
          "ViewChannel",
          "SendMessages",
          "ReadMessageHistory",
          "AttachFiles",
          "EmbedLinks",
        ],
      },
      {
        id: supportRoleId,
        allow: [
          "ViewChannel",
          "SendMessages",
          "ReadMessageHistory",
          "AttachFiles",
          "EmbedLinks",
        ],
      },
    ];

    try {
      const ticketChannel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0,
        parent: ticketCategoryId,
        permissionOverwrites: permissions,
        reason: await interaction.t("TICKET.AUDIT_REASON", {
          tag: interaction.user.tag,
          userId: interaction.user.id,
        }),
      });

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("TICKET.CHANNEL.TITLE", { type: selectedType }))
        .setDescription(await interaction.t("TICKET.CHANNEL.DESCRIPTION", { user: `${interaction.user}` }))
        .setColor("Blue")
        .setFooter({ text: await interaction.t("TICKET.CHANNEL.FOOTER") })
        .setTimestamp();

      await ticketChannel.send({
        content: `${interaction.user} <@&${supportRoleId}>`,
        embeds: [embed],
      });

      await interaction.reply({
        content: await interaction.t("TICKET.CREATED", { channel: `${ticketChannel}` }),
        ephemeral: true,
      });
    } catch (error) {
      logger.error(`Erreur lors de la création du ticket : ${error}`);
      return interaction.reply({
        content: await interaction.t("TICKET.CREATE_FAILED"),
        ephemeral: true,
      });
    }
  },
};
