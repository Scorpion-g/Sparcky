const {
  AttachmentBuilder,
  SlashCommandBuilder,
} = require("discord.js");

const calculateLevelXp = require("../../utils/calculateLevelXp");
const Level = require("../../models/Level");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { RankCardBuilder, Font } = require("canvacord");

try {
  Font.loadDefault();
} catch (e) {
  console.warn("Font.loadDefault() not available in this version of canvacord:", e.message);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Affiche ton niveau ou celui d'un autre membre.")
    .setDescriptionLocalizations({
      "en-US": "Show your level or another member's level.",
    })
    .addUserOption((option) =>
      option
        .setName("target-user")
        .setDescription("Le membre dont tu veux voir le niveau")
        .setDescriptionLocalizations({
          "en-US": "The member whose level you want to see",
        })
        .setRequired(false),
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: await interaction.t("ERRORS.GUILD_ONLY"),
        ephemeral: true,
      });
    }

    const guildConfig = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
    if (guildConfig && guildConfig.xpEnabled === false) {
      return interaction.reply({
        content: "❌ Le système de niveaux et d'expérience est actuellement désactivé sur ce serveur.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser("target-user") || interaction.user;
    const targetMember = await interaction.guild.members.fetch(targetUser.id);

    const fetchedLevel = await Level.findOne({
      userId: targetUser.id,
      guildId: interaction.guild.id,
    });

    if (!fetchedLevel) {
      return interaction.editReply(
        targetUser.id !== interaction.user.id
          ? await interaction.t("ECONOMY.LEVEL.NO_LEVEL_OTHER", { tag: targetUser.tag })
          : await interaction.t("ECONOMY.LEVEL.NO_LEVEL_SELF"),
      );
    }

    let allLevels = await Level.find({ guildId: interaction.guild.id }).select("-_id userId level xp");

    allLevels.sort((a, b) => (a.level === b.level ? b.xp - a.xp : b.level - a.level));
    const currentRank = allLevels.findIndex((lvl) => lvl.userId === targetUser.id) + 1;

    const rank = new RankCardBuilder()
      .setAvatar(targetUser.displayAvatarURL({ size: 256 }))
      .setRank(currentRank)
      .setLevel(fetchedLevel.level)
      .setCurrentXP(fetchedLevel.xp)
      .setRequiredXP(calculateLevelXp(fetchedLevel.level))
      .setStyles({
        progressbar: {
          thumb: { style: { backgroundColor: "#FFC300" } },
        },
      })
      .setUsername(targetUser.username)
      .setDisplayName(targetMember.displayName);

    const data = await rank.build();
    const attachment = new AttachmentBuilder(data, { name: "rank.png" });

    return interaction.editReply({ files: [attachment] });
  },
};
