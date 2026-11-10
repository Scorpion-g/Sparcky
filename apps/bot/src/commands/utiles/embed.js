const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Créer un embed personnalisé')
    .setDescriptionLocalizations({
      "en-US": "Create a custom embed",
    })
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Titre de l’embed')
        .setDescriptionLocalizations({
          "en-US": "Embed title",
        })
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description de l’embed (utilise \\n pour des retours à la ligne)')
        .setDescriptionLocalizations({
          "en-US": "Embed description (use \\n for line breaks)",
        })
        .setRequired(true))
    .addStringOption(option =>
      option.setName('footer')
        .setDescription('Texte du pied de page de l’embed (tu peux mettre {year})')
        .setDescriptionLocalizations({
          "en-US": "Embed footer text (you can use {year})",
        })
        .setRequired(false))
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Couleur de l’embed en hexadécimal (ex: #FF5733)')
        .setDescriptionLocalizations({
          "en-US": "Embed color in hex (e.g. #FF5733)",
        })
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('URL de l’image à afficher dans l’embed')
        .setDescriptionLocalizations({
          "en-US": "Image URL to display in the embed",
        })
        .setRequired(false))
    .addStringOption(option =>
      option.setName('thumbnail')
        .setDescription('URL de la miniature à afficher dans l’embed')
        .setDescriptionLocalizations({
          "en-US": "Thumbnail URL to display in the embed",
        })
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('mention')
        .setDescription('Rôle à mentionner avec l’embed')
        .setDescriptionLocalizations({
          "en-US": "Role to mention with the embed",
        })
        .setRequired(false))
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.Administrator)), // seul les admins

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description')?.replace(/\\n/g, '\n');
    const footer = interaction.options.getString('footer');
    const color = interaction.options.getString('color') || '#00AAFF';
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const roleToMention = interaction.options.getRole('mention');

    // Vérification des URLs
    function isValidUrl(string) {
      try {
        // Utilise explicitement le global pour éviter ESLint no-undef sur URL
        new globalThis.URL(string);
        return true;
      } catch {
        return false;
      }
    }
    if (image && !isValidUrl(image)) {
      return interaction.reply({
        content: await interaction.t("UTILES.EMBED.INVALID_IMAGE_URL"),
        ephemeral: true,
      });
    }
    if (thumbnail && !isValidUrl(thumbnail)) {
      return interaction.reply({
        content: await interaction.t("UTILES.EMBED.INVALID_THUMBNAIL_URL"),
        ephemeral: true,
      });
    }

    // Construction de l'embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (footer) {
      const currentYear = new Date().getFullYear();
      embed.setFooter({ text: footer.replace('{year}', currentYear) });
    }
    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);

    // Message final
    const messageContent = roleToMention ? `${roleToMention}` : null;

    await interaction.reply({
      content: messageContent,
      embeds: [embed]
    });
  },
};
