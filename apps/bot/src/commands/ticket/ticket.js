const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Système de ticket")
    .setDescriptionLocalizations({
      fr: "Système de ticket",
      "en-US": "Ticket system",
    })
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.Administrator))
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Configurer le système de ticket")
        .setDescriptionLocalizations({
          fr: "Configurer le système de ticket",
          "en-US": "Configure the ticket system",
        })
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Le salon où le panneau sera envoyé")
            .setDescriptionLocalizations({
              fr: "Le salon où le panneau sera envoyé",
              "en-US": "Channel where the panel will be sent",
            })
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addRoleOption((opt) =>
          opt
            .setName("support_role")
            .setDescription("Rôle qui pourra voir les tickets")
            .setDescriptionLocalizations({
              fr: "Rôle qui pourra voir les tickets",
              "en-US": "Role that can view tickets",
            })
            .setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName("ticket_category")
            .setDescription("Catégorie où les tickets seront créés")
            .setDescriptionLocalizations({
              fr: "Catégorie où les tickets seront créés",
              "en-US": "Category where tickets will be created",
            })
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory),
        )
        .addChannelOption((opt) =>
          opt
            .setName("log_channel")
            .setDescription("Salon pour logs")
            .setDescriptionLocalizations({
              fr: "Salon pour logs",
              "en-US": "Log channel",
            })
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((opt) =>
          opt
            .setName("ticket_types")
            .setDescription("Types de tickets séparés par des virgules")
            .setDescriptionLocalizations({
              fr: "Types de tickets séparés par des virgules",
              "en-US": "Ticket types separated by commas",
            })
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("ticket_description")
            .setDescription("Description du panneau")
            .setDescriptionLocalizations({
              fr: "Description du panneau",
              "en-US": "Panel description",
            })
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Supprimer la configuration du système de ticket")
        .setDescriptionLocalizations({
          fr: "Supprimer la configuration du système de ticket",
          "en-US": "Delete the ticket system configuration",
        }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("close")
        .setDescription("Fermer le ticket actuel")
        .setDescriptionLocalizations({
          fr: "Fermer le ticket actuel",
          "en-US": "Close the current ticket",
        }),
    ),

  async execute(interaction) {
    const { guild, options } = interaction;
    const subcommand = options.getSubcommand();
    const TicketSettings = require("../../models/Ticket");

    if (subcommand === "setup") {
      const channel = options.getChannel("channel");
      const supportRole = options.getRole("support_role");
      const ticketCategory = options.getChannel("ticket_category");
      const logChannel = options.getChannel("log_channel");
      const ticketTypesInput = options.getString("ticket_types");
      const ticketDescription =
        options.getString("ticket_description")?.replace(/\\n/g, "\n") ||
        (await interaction.t("TICKET.PANEL.DEFAULT_DESCRIPTION"));

      // Check si configuration déjà existante
      const existingConfig = await TicketSettings.findOne({
        guildId: guild.id,
      });
      if (existingConfig) {
        return interaction.reply({
          content: await interaction.t("TICKET.ALREADY_CONFIGURED"),
          ephemeral: true,
        });
      }

      // Préparer les types de tickets
      let ticketTypes = ticketTypesInput
        ? ticketTypesInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : (await interaction.t("TICKET.PANEL.DEFAULT_TYPES")).split(",");
      if (ticketTypes.length > 25) ticketTypes = ticketTypes.slice(0, 25);

      // Enregistrer la config
      const newConfig = new TicketSettings({
        guildId: guild.id,
        supportRoleId: supportRole.id,
        ticketCategoryId: ticketCategory.id,
        logChannelId: logChannel.id,
        ticketTypes,
      });
      await newConfig.save();

      // Créer le panneau
      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("TICKET.PANEL.TITLE"))
        .setDescription(ticketDescription)
        .setColor("#0099ff")
        .setTimestamp()
        .setFooter({
          text: await interaction.t("TICKET.PANEL.FOOTER", {
            user: interaction.user.tag,
          }),
        });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("ticket_menu")
          .setPlaceholder(await interaction.t("TICKET.PANEL.PLACEHOLDER"))
          .addOptions(
            ticketTypes.map((type) => ({
              label: type,
              description: `${type}`,
              value: type,
              emoji: "🎫",
            })),
          ),
      );

      await channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({
        content: await interaction.t("TICKET.CONFIGURED", { channel: `${channel}` }),
        ephemeral: true,
      });
    }

    if (subcommand === "delete") {
      const existingConfig = await TicketSettings.findOne({
        guildId: guild.id,
      });
      if (!existingConfig) {
        return interaction.reply({
          content: await interaction.t("TICKET.NO_CONFIG"),
          ephemeral: true,
        });
      }
      await TicketSettings.deleteOne({ guildId: guild.id });
      return interaction.reply({
        content: await interaction.t("TICKET.DELETED"),
        ephemeral: true,
      });
    }

    if (subcommand === "close") {
      const channel = interaction.channel;
      const existingTicket = await TicketSettings.findOne({
        guildId: guild.id,
      });

      if (!existingTicket) {
        return interaction.reply({
          content: await interaction.t("TICKET.NOT_CONFIGURED"),
          ephemeral: true,
        });
      }

      if (!channel.name.startsWith("ticket-")) {
        return interaction.reply({
          content: await interaction.t("TICKET.NOT_A_TICKET"),
          ephemeral: true,
        });
      }

      if (
        !interaction.member.roles.cache.has(existingTicket.supportRoleId) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({
          content: await interaction.t("TICKET.CLOSE_NO_PERMISSION"),
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const discordTranscripts = require("discord-html-transcripts");
      const transcript = await discordTranscripts.createTranscript(channel, {
        limit: -1,
        returnBuffer: false,
        fileName: await interaction.t("TICKET.TRANSCRIPT_FILENAME", {
          channel: channel.name,
        }),
      });

      const logCh = guild.channels.cache.get(existingTicket.logChannelId);
      if (logCh && logCh.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle(await interaction.t("TICKET.CLOSE.LOG.TITLE"))
          .setDescription(
            await interaction.t("TICKET.CLOSE.LOG.DESCRIPTION", {
              channel: channel.name,
              user: interaction.user.tag,
            }),
          )
          .setColor("#ff0000")
          .setTimestamp();

        await logCh.send({
          embeds: [logEmbed],
          files: [transcript],
        });
      }

      await channel.delete().catch(() => {});

      return interaction.editReply({
        content: await interaction.t("TICKET.CLOSE.SUCCESS"),
      });
    }
  },
};
