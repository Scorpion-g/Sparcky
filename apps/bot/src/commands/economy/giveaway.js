const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Giveaway = require("../../models/Giveaway");
const logger = require("../../utils/logger");
const {
  buildGiveawayEmbed,
  buildGiveawayButton,
  finishGiveaway,
  rerollGiveaway
} = require("../../utils/giveawayUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Gérer les giveaways")
    .setDescriptionLocalizations({
      fr: "Gérer les giveaways",
      "en-US": "Manage giveaways",
      "es-ES": "Administrar sorteos",
    })
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Démarrer un giveaway")
        .setDescriptionLocalizations({
          fr: "Démarrer un giveaway",
          "en-US": "Start a giveaway",
          "es-ES": "Iniciar un sorteo",
        })
        .addStringOption((opt) =>
          opt
            .setName("prize")
            .setDescription("Prix du giveaway")
            .setDescriptionLocalizations({
              fr: "Prix du giveaway",
              "en-US": "Giveaway prize",
              "es-ES": "Premio del sorteo",
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
              "es-ES": "Duración en minutos",
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
              "es-ES": "Número de ganadores",
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
              "es-ES": "Canal para el sorteo",
            })
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Type de gain (pièces, XP, rôle, autre)")
            .setDescriptionLocalizations({
              fr: "Type de gain (pièces, XP, rôle, autre)",
              "en-US": "Reward type (coins, XP, role, other)",
              "es-ES": "Tipo de premio (monedas, XP, rol, otro)",
            })
            .setRequired(false)
            .addChoices(
              { name: "🪙 Pièces (Système d'Économie)", value: "coins" },
              { name: "⭐ Expérience (Système d'XP)", value: "xp" },
              { name: "🎭 Rôle Discord", value: "role" },
              { name: "🎁 Autre lot personnalisé", value: "other" }
            )
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Montant numérique (si pièces ou XP)")
            .setDescriptionLocalizations({
              fr: "Montant numérique (si pièces ou XP)",
              "en-US": "Numeric amount (if coins or XP)",
              "es-ES": "Monto numérico (si son monedas o XP)",
            })
            .setMinValue(1)
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Rôle Discord à attribuer (si récompense rôle)")
            .setDescriptionLocalizations({
              fr: "Rôle Discord à attribuer (si récompense rôle)",
              "en-US": "Discord role to award (if role reward)",
              "es-ES": "Rol de Discord a otorgar (si el premio es un rol)",
            })
            .setRequired(false)
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("Terminer un giveaway")
        .setDescriptionLocalizations({
          fr: "Terminer un giveaway",
          "en-US": "End a giveaway",
          "es-ES": "Finalizar un sorteo",
        })
        .addStringOption((opt) =>
          opt
            .setName("giveaway_id")
            .setDescription("ID du giveaway à terminer")
            .setDescriptionLocalizations({
              fr: "ID du giveaway à terminer",
              "en-US": "Giveaway ID to end",
              "es-ES": "ID del sorteo a finalizar",
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
          "es-ES": "Volver a sortear",
        })
        .addStringOption((opt) =>
          opt
            .setName("giveaway_id")
            .setDescription("ID du giveaway à relancer")
            .setDescriptionLocalizations({
              fr: "ID du giveaway à relancer",
              "en-US": "Giveaway ID to reroll",
              "es-ES": "ID del sorteo a relanzar",
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
      const rewardType = interaction.options.getString("type") || "other";
      const rewardAmount = interaction.options.getInteger("amount") || null;
      const role = interaction.options.getRole("role") || null;

      if (channel.type !== 0) {
        return interaction.reply({
          content: await interaction.t("ECONOMY.GIVEAWAY.START.INVALID_CHANNEL"),
          ephemeral: true,
        });
      }

      // Formatage du lot si type spécifique
      let finalPrize = prize.trim();
      if (rewardType === "coins" && rewardAmount && !finalPrize.includes(String(rewardAmount))) {
        finalPrize = `${rewardAmount} pièces (${finalPrize})`;
      } else if (rewardType === "xp" && rewardAmount && !finalPrize.includes(String(rewardAmount))) {
        finalPrize = `${rewardAmount} XP (${finalPrize})`;
      } else if (rewardType === "role" && role && !finalPrize.includes(role.name)) {
        finalPrize = `Rôle @${role.name} (${finalPrize})`;
      }

      const endTime = new Date(Date.now() + duration * 60000);

      const giveaway = new Giveaway({
        guildId: interaction.guild.id,
        channelId: channel.id,
        prize: finalPrize,
        rewardType,
        rewardAmount: (rewardType === "coins" || rewardType === "xp") ? rewardAmount : null,
        rewardRoleId: (rewardType === "role" && role) ? role.id : null,
        endTime,
        winnersCount,
        participants: [],
        winners: [],
        hostedBy: interaction.user.id,
        isEnded: false,
      });

      await giveaway.save();

      const embed = buildGiveawayEmbed(giveaway, false);
      const row = buildGiveawayButton(giveaway, false);

      const giveawayMessage = await channel.send({ embeds: [embed], components: [row] });
      giveaway.messageId = giveawayMessage.id;
      await giveaway.save();

      return interaction.reply({
        content: await interaction.t("ECONOMY.GIVEAWAY.START.SUCCESS", {
          channel: `${channel}`,
        }),
        ephemeral: true,
      });
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

      const finished = await finishGiveaway(interaction.client, giveaway);
      const winnersMentions =
        finished?.winners?.length > 0
          ? finished.winners.map((id) => `<@${id}>`).join(", ")
          : "*Aucun gagnant*";

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

      const result = await rerollGiveaway(interaction.client, giveaway);
      if (!result.success) {
        return interaction.reply({
          content:
            result.reason === "NO_PARTICIPANTS"
              ? await interaction.t("ECONOMY.GIVEAWAY.REROLL.NO_PARTICIPANTS")
              : "Impossible d'effectuer le reroll pour ce giveaway.",
          ephemeral: true,
        });
      }

      const winnersMentions = result.winners.map((w) => `<@${w}>`).join(", ");

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
