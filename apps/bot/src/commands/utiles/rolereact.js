const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolereact")
    .setDescription("Configure un message de réaction pour obtenir un rôle")
    .setDescriptionLocalizations({
      "en-US": "Configure a reaction message to get a role",
    })
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("L'ID du message à configurer")
        .setDescriptionLocalizations({
          "en-US": "ID of the message to configure",
        })
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Le rôle à attribuer")
        .setDescriptionLocalizations({
          "en-US": "Role to assign",
        })
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("button_emoji")
        .setDescription("Emoji du bouton (Unicode ou ID d'emoji personnalisé)")
        .setDescriptionLocalizations({
          "en-US": "Button emoji (Unicode or custom emoji ID)",
        })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageRoles)),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: await interaction.t("ERRORS.GUILD_ONLY"),
        ephemeral: true,
      });
    }

    const messageId = interaction.options.getString("message_id");
    const role = interaction.options.getRole("role");
    const buttonEmoji = interaction.options.getString("button_emoji");

    await interaction.deferReply({ ephemeral: true });

    if (
      !interaction.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageRoles,
      )
    ) {
      return interaction.editReply(
        await interaction.t("UTILES.ROLEREACT.NO_BOT_PERMISSION"),
      );
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.editReply(
        await interaction.t("UTILES.ROLEREACT.ROLE_TOO_HIGH"),
      );
    }

    let targetMessage;
    try {
      targetMessage = await interaction.channel.messages.fetch(messageId);
    } catch (error) {
      await interaction.editReply(
        await interaction.t("UTILES.ROLEREACT.MESSAGE_FETCH_FAILED"),
      );
      logger.error("Erreur lors de la récupération du message :", error);
      return;
    }

    let emoji = buttonEmoji;
    if (/^\d+$/.test(buttonEmoji)) {
      emoji = interaction.guild.emojis.cache.get(buttonEmoji);
      if (!emoji) {
        return interaction.editReply(
          await interaction.t("UTILES.ROLEREACT.EMOJI_NOT_FOUND"),
        );
      }
    }

    const button = new ButtonBuilder()
      .setCustomId(`role_react_${role.id}`)
      .setLabel(await interaction.t("UTILES.ROLEREACT.BUTTON_LABEL", { role: role.name }))
      .setStyle(ButtonStyle.Primary)
      .setEmoji(emoji);

    let row;
    if (targetMessage.components.length > 0) {
      row = ActionRowBuilder.from(targetMessage.components[0]);
      if (
        row.components.some(
          (comp) => comp.data.custom_id === button.data.custom_id,
        )
      ) {
        return interaction.editReply(
          await interaction.t("UTILES.ROLEREACT.BUTTON_ALREADY_EXISTS"),
        );
      }
      if (row.components.length >= 5) {
        return interaction.editReply(
          await interaction.t("UTILES.ROLEREACT.TOO_MANY_BUTTONS"),
        );
      }
      row.addComponents(button);
    } else {
      row = new ActionRowBuilder().addComponents(button);
    }

    try {
      await targetMessage.edit({ components: [row] });
    } catch (error) {
      await interaction.editReply(
        await interaction.t("UTILES.ROLEREACT.MESSAGE_EDIT_FAILED"),
      );
      logger.error("Erreur lors de l'édition du message :", error);
      return;
    }

    const successEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(await interaction.t("UTILES.ROLEREACT.SUCCESS_TITLE"))
      .setDescription(
        await interaction.t("UTILES.ROLEREACT.SUCCESS_DESC", { role: role.name }),
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [successEmbed] });
  },
};
