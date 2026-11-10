const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Affiche le classement des membres")
    .setDescriptionLocalizations({
      fr: "Affiche le classement des membres",
      "en-US": "Show the members leaderboard",
    })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("warns")
        .setDescription("Classement des membres avec le plus de warns")
        .setDescriptionLocalizations({
          fr: "Classement des membres avec le plus de warns",
          "en-US": "Leaderboard of members with the most warnings",
        }),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("money")
        .setDescription("Classement des membres avec le plus d'argent")
        .setDescriptionLocalizations({
          fr: "Classement des membres avec le plus d'argent",
          "en-US": "Leaderboard of members with the most money",
        }),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("level")
        .setDescription("Classement des membres avec le plus haut niveau")
        .setDescriptionLocalizations({
          fr: "Classement des membres avec le plus haut niveau",
          "en-US": "Leaderboard of members with the highest level",
        }),
    ),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande doit être exécutée sur un serveur.",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    const GuildConfiguration = require("../../models/GuildConfiguration");
    const guildConfig = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();

    if (subcommand === "money" && guildConfig && guildConfig.economyEnabled === false) {
      return interaction.reply({
        content: "❌ Le système d'économie est actuellement désactivé sur ce serveur.",
        ephemeral: true,
      });
    }

    if (subcommand === "level" && guildConfig && guildConfig.xpEnabled === false) {
      return interaction.reply({
        content: "❌ Le système de niveaux et d'expérience est actuellement désactivé sur ce serveur.",
        ephemeral: true,
      });
    }

    const configs = {
      warns: {
        Model: require("../../models/Warn"),
        field: "warn",
        titleKey: "ECONOMY.LEADERBOARD.TITLES.WARNS",
        unitKey: "ECONOMY.LEADERBOARD.UNITS.WARNS",
      },
      money: {
        Model: require("../../models/User"),
        field: "balance",
        titleKey: "ECONOMY.LEADERBOARD.TITLES.MONEY",
        unitKey: "ECONOMY.LEADERBOARD.UNITS.MONEY",
      },
      level: {
        Model: require("../../models/Level"),
        field: "level",
        titleKey: "ECONOMY.LEADERBOARD.TITLES.LEVEL",
        unitKey: "ECONOMY.LEADERBOARD.UNITS.LEVEL",
      },
    };

    const cfg = configs[subcommand];
    if (!cfg) {
      return interaction.reply({
        content: await interaction.t("ECONOMY.LEADERBOARD.INVALID_SUBCOMMAND"),
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const topEntries = await cfg.Model.find({ guildId: interaction.guild.id })
      .sort({ [cfg.field]: -1 })
      .limit(10);

    if (topEntries.length === 0) {
      return interaction.editReply(
        await interaction.t("ECONOMY.LEADERBOARD.NO_DATA"),
      );
    }

    const unit = await interaction.t(cfg.unitKey);
    const title = await interaction.t(cfg.titleKey);

    let description = "";
    for (let i = 0; i < topEntries.length; i++) {
      const entry = topEntries[i];
      const member = await interaction.guild.members
        .fetch(entry.userId)
        .catch(() => null);
      const memberName = member ? member.user.tag : await interaction.t("ECONOMY.LEADERBOARD.UNKNOWN_USER");
      const value = entry[cfg.field];

      description += `**${i + 1}. ${memberName}** - ${value} ${unit}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("#0099ff")
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
