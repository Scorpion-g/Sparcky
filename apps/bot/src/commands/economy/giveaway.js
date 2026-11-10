const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Giveaway = require("../../models/Giveaway");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Gérer les giveaways")
    .setDescriptionLocalizations({
      fr: "Gérer les giveaways",
      "en-US": "Manage giveaways",
    })
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Démarrer un giveaway")
        .setDescriptionLocalizations({
          fr: "Démarrer un giveaway",
          "en-US": "Start a giveaway",
        })
        .addStringOption((opt) =>
          opt
            .setName("prize")
            .setDescription("Prix du giveaway")
            .setDescriptionLocalizations({
              fr: "Prix du giveaway",
              "en-US": "Giveaway prize",
            })
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("duration")
            .setDescription("Durée du giveaway en minutes")
            .setDescriptionLocalizations({
              fr: "Durée du giveaway en minutes",
              "en-US": "Giveaway duration in minutes",
            })
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("winners")
            .setDescription("Nombre de gagnants")
            .setDescriptionLocalizations({
              fr: "Nombre de gagnants",
              "en-US": "Number of winners",
            })
            .setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Canal pour le giveaway")
            .setDescriptionLocalizations({
              fr: "Canal pour le giveaway",
              "en-US": "Channel for the giveaway",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("Terminer un giveaway")
        .setDescriptionLocalizations({
          fr: "Terminer un giveaway",
          "en-US": "End a giveaway",
        })
        .addStringOption((opt) =>
          opt
            .setName("giveaway_id")
            .setDescription("ID du giveaway à terminer")
            .setDescriptionLocalizations({
              fr: "ID du giveaway à terminer",
              "en-US": "Giveaway ID to end",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Relancer un giveaway")
        .setDescriptionLocalizations({
          fr: "Relancer un giveaway",
          "en-US": "Reroll a giveaway",
        })
        .addStringOption((opt) =>
          opt
            .setName("giveaway_id")
            .setDescription("ID du giveaway à relancer")
            .setDescriptionLocalizations({
              fr: "ID du giveaway à relancer",
              "en-US": "Giveaway ID to reroll",
            })
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "start") {
      const prize = interaction.options.getString("prize");
      const duration = interaction.options.getInteger("duration");
      const winnersCount = interaction.options.getInteger("winners");
      const channel = interaction.options.getChannel("channel");

      if (channel.type !== 0) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.START.INVALID_CHANNEL"),
          ephemeral: true,
        });
      }

      const endTime = Date.now() + duration * 60000;

      const giveaway = new Giveaway({
        guildId: interaction.guild.id,
        channelId: channel.id,
        prize,
        endTime,
        winnersCount,
        participants: [],
        isEnded: false,
      });

      await giveaway.save();

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("ECONOMY.GIVEAWAY.START.EMBED.TITLE"))
        .setDescription(
          await interaction.t("ECONOMY.GIVEAWAY.START.EMBED.DESCRIPTION", {
            prize,
            duration,
            winnersCount,
          }),
        )
        .setFooter({
          text: await interaction.t("ECONOMY.GIVEAWAY.START.EMBED.FOOTER", {
            id: giveaway._id.toString(),
          }),
        })
        .setColor("#00ff00")
        .setTimestamp();

      const giveawayMessage = await channel.send({ embeds: [embed] });
      await giveawayMessage.react("🎉");

      giveaway.messageId = giveawayMessage.id;
      await giveaway.save();

      await interaction.reply({
        content: await interaction.t("ECONOMY.GIVEAWAY.START.SUCCESS", {
          channel: `${channel}`,
        }),
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "end") {
      const giveawayId = interaction.options.getString("giveaway_id");
      const giveaway = await Giveaway.findOne({
        _id: giveawayId,
        guildId: interaction.guild.id,
      });

      if (!giveaway) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.NOT_FOUND"),
          ephemeral: true,
        });
      }

      if (giveaway.isEnded) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.ALREADY_ENDED"),
          ephemeral: true,
        });
      }

      giveaway.isEnded = true;
      await giveaway.save();

      const channel = interaction.guild.channels.cache.get(giveaway.channelId);
      if (!channel) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.CHANNEL_MISSING"),
          ephemeral: true,
        });
      }

      const giveawayMessage = await channel.messages
        .fetch(giveaway.messageId)
        .catch(() => null);
      if (!giveawayMessage) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.MESSAGE_MISSING"),
          ephemeral: true,
        });
      }

      const participants = [...giveaway.participants];
      if (participants.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(await interaction.t("ECONOMY.GIVEAWAY.END.EMBED.TITLE"))
          .setDescription(
            await interaction.t("ECONOMY.GIVEAWAY.END.EMBED.NO_PARTICIPANTS", {
              prize: giveaway.prize,
            }),
          )
          .setColor("#ff0000")
          .setTimestamp();
        await giveawayMessage.edit({ embeds: [embed] });

        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.END.NO_PARTICIPANTS"),
          ephemeral: true,
        });
      }

      const winners = [];
      while (winners.length < giveaway.winnersCount && participants.length > 0) {
        const randomIndex = Math.floor(Math.random() * participants.length);
        winners.push(participants.splice(randomIndex, 1)[0]);
      }

      const winnersMentions = winners.map((w) => `<@${w}>`).join(", ");

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("ECONOMY.GIVEAWAY.END.EMBED.TITLE"))
        .setDescription(
          await interaction.t("ECONOMY.GIVEAWAY.END.EMBED.WINNERS", {
            prize: giveaway.prize,
            winners: winnersMentions,
          }),
        )
        .setColor("#00ff00")
        .setTimestamp();
      await giveawayMessage.edit({ embeds: [embed] });

      return interaction.reply({
        content: await interaction.t("ECONOMY.GIVEAWAY.END.SUCCESS", {
          winners: winnersMentions,
        }),
        ephemeral: true,
      });
    }

    if (subcommand === "reroll") {
      const giveawayId = interaction.options.getString("giveaway_id");
      const giveaway = await Giveaway.findOne({
        _id: giveawayId,
        guildId: interaction.guild.id,
      });

      if (!giveaway) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.NOT_FOUND"),
          ephemeral: true,
        });
      }

      if (!giveaway.isEnded) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.NOT_ENDED"),
          ephemeral: true,
        });
      }

      const channel = interaction.guild.channels.cache.get(giveaway.channelId);
      if (!channel) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.CHANNEL_MISSING"),
          ephemeral: true,
        });
      }

      const giveawayMessage = await channel.messages
        .fetch(giveaway.messageId)
        .catch(() => null);
      if (!giveawayMessage) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.MESSAGE_MISSING"),
          ephemeral: true,
        });
      }

      const participants = [...giveaway.participants];
      if (participants.length === 0) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.REROLL.NO_PARTICIPANTS"),
          ephemeral: true,
        });
      }

      const winners = [];
      while (winners.length < giveaway.winnersCount && participants.length > 0) {
        const randomIndex = Math.floor(Math.random() * participants.length);
        winners.push(participants.splice(randomIndex, 1)[0]);
      }

      const winnersMentions = winners.map((w) => `<@${w}>`).join(", ");

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("ECONOMY.GIVEAWAY.REROLL.EMBED.TITLE"))
        .setDescription(
          await interaction.t("ECONOMY.GIVEAWAY.REROLL.EMBED.DESCRIPTION", {
            prize: giveaway.prize,
            winners: winnersMentions,
          }),
        )
        .setColor("#00ff00")
        .setTimestamp();
      await giveawayMessage.edit({ embeds: [embed] });

      return interaction.reply({
        content: await interaction.t("ECONOMY.GIVEAWAY.REROLL.SUCCESS", {
          winners: winnersMentions,
        }),
        ephemeral: true,
      });
    }

    logger.warn(`[giveaway] Unknown subcommand: ${subcommand}`);
    return interaction.reply({
      content: await interaction.t("ECONOMY.GIVEAWAY.UNKNOWN_SUBCOMMAND"),
      ephemeral: true,
    });
  },
};
