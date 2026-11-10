const {
  ContextMenuCommandBuilder,
  EmbedBuilder,
  ApplicationCommandType,
} = require("discord.js");
const Level = require("../../models/Level");
const Warn = require("../../models/Warn");
const logger = require("../../utils/logger");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("info")
    .setNameLocalizations({
      "en-US": "info",
      fr: "info",
    })
    .setType(ApplicationCommandType.User),

  async execute(interaction) {
    try {
      const user = interaction.targetUser;
      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);
      if (!member) {
        return interaction.reply({
          content: await interaction.t("INFOUSER.NOT_IN_GUILD"),
          ephemeral: true,
        });
      }

      const levelData = await Level.findOne({
        userId: user.id,
        guildId: interaction.guild.id,
      });

      const warns = await Warn.find({
        userId: user.id,
        guildId: interaction.guild.id,
      });

      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("INFOUSER.TITLE", { tag: user.tag }))
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor("#0099ff")
        .addFields(
          {
            name: await interaction.t("INFOUSER.FIELDS.ID"),
            value: user.id,
            inline: true,
          },
          {
            name: await interaction.t("INFOUSER.FIELDS.ACCOUNT_CREATED"),
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
            inline: true,
          },
          {
            name: await interaction.t("INFOUSER.FIELDS.JOINED_GUILD"),
            value: member.joinedAt
              ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`
              : await interaction.t("INFOUSER.UNKNOWN"),
            inline: true,
          },
          {
            name: await interaction.t("INFOUSER.FIELDS.ROLES"),
            value:
              member.roles.cache.size > 1
                ? member.roles.cache
                    .filter((r) => r.id !== interaction.guild.id)
                    .map((r) => r.name)
                    .join(", ")
                : await interaction.t("INFOUSER.NO_ROLE"),
            inline: false,
          },
          {
            name: await interaction.t("INFOUSER.FIELDS.WARNS"),
            value: warns.length.toString(),
            inline: true,
          },
          {
            name: await interaction.t("INFOUSER.FIELDS.LEVEL"),
            value: levelData
              ? await interaction.t("INFOUSER.LEVEL_VALUE", {
                  level: levelData.level,
                  xp: levelData.xp,
                })
              : await interaction.t("INFOUSER.NO_LEVEL"),
            inline: true,
          },
        )
        .setTimestamp();

      try {
        if (member.presence) {
          embed.addFields({
            name: await interaction.t("INFOUSER.FIELDS.STATUS"),
            value: String(member.presence.status),
            inline: true,
          });

          if (member.presence.activities.length > 0) {
            const resolvedActivities = (
              await Promise.all(
                member.presence.activities.map(async (activity) => {
                  let activityTypeKey;
                  switch (activity.type) {
                    case 0:
                      activityTypeKey = "INFOUSER.ACTIVITY.PLAYING";
                      break;
                    case 1:
                      activityTypeKey = "INFOUSER.ACTIVITY.STREAMING";
                      break;
                    case 2:
                      activityTypeKey = "INFOUSER.ACTIVITY.LISTENING";
                      break;
                    case 3:
                      activityTypeKey = "INFOUSER.ACTIVITY.WATCHING";
                      break;
                    case 4:
                      activityTypeKey = "INFOUSER.ACTIVITY.CUSTOM";
                      break;
                    case 5:
                      activityTypeKey = "INFOUSER.ACTIVITY.COMPETING";
                      break;
                    default:
                      activityTypeKey = "INFOUSER.ACTIVITY.DOING";
                  }

                  const prefix = await interaction.t(activityTypeKey);
                  return `${prefix} ${activity.name}`;
                }),
              )
            ).join("\n");

            embed.addFields({
              name: await interaction.t("INFOUSER.FIELDS.ACTIVITIES"),
              value: resolvedActivities,
              inline: false,
            });
          }
        }
      } catch (error) {
        logger.error("Erreur lors de la récupération de la présence :", error);
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error(
        "Erreur lors de l'exécution de la commande infouser :",
        error,
      );
      await interaction.reply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
