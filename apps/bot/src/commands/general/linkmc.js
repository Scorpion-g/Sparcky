const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { COLORS } = require("../../utils/theme");

// Regex de validation stricte du pseudo Minecraft :
// 3 à 16 caractères alphanumériques + underscores (Java) ou point (Floodgate/Bedrock).
// Aucun espace, guillemet, point-virgule ou caractère spécial pour garantir la sécurité RCON.
const MC_USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,16}$/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("link-mc")
    .setDescription("Lier ou gérer votre pseudo Minecraft sur ce serveur")
    .setDescriptionLocalizations({
      fr: "Lier ou gérer votre pseudo Minecraft sur ce serveur",
      "en-US": "Link or manage your Minecraft username on this server",
    })
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Lier votre compte Discord à votre pseudo Minecraft")
        .setDescriptionLocalizations({
          fr: "Lier votre compte Discord à votre pseudo Minecraft",
          "en-US": "Link your Discord account to your Minecraft username",
        })
        .addStringOption((opt) =>
          opt
            .setName("pseudo")
            .setDescription("Votre pseudo Minecraft (3 à 16 caractères)")
            .setDescriptionLocalizations({
              fr: "Votre pseudo Minecraft (3 à 16 caractères)",
              "en-US": "Your Minecraft username (3-16 characters)",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("unlink")
        .setDescription("Délier votre pseudo Minecraft de ce serveur")
        .setDescriptionLocalizations({
          fr: "Délier votre pseudo Minecraft de ce serveur",
          "en-US": "Unlink your Minecraft username from this server",
        }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("Afficher le pseudo Minecraft lié à un utilisateur")
        .setDescriptionLocalizations({
          fr: "Afficher le pseudo Minecraft lié à un utilisateur",
          "en-US": "Show the Minecraft username linked to a user",
        })
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("L'utilisateur à consulter (vous par défaut)")
            .setDescriptionLocalizations({
              fr: "L'utilisateur à consulter (vous par défaut)",
              "en-US": "The user to inspect (defaults to you)",
            })
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "❌ Cette commande doit être exécutée sur un serveur Discord.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "set") {
      const pseudoInput = interaction.options.getString("pseudo").trim();

      if (!MC_USERNAME_REGEX.test(pseudoInput)) {
        return interaction.reply({
          content:
            "❌ **Pseudo Minecraft invalide !**\nLe pseudo doit comporter entre 3 et 16 caractères (lettres, chiffres, underscores `_` ou points `.`). Les espaces et symboles spéciaux ne sont pas autorisés.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      // Vérifier si un autre membre a déjà lié ce pseudo sur ce serveur
      const existingUser = await User.findOne({
        guildId,
        minecraftUsername: { $regex: new RegExp(`^${pseudoInput}$`, "i") },
        userId: { $ne: interaction.user.id },
      }).lean();

      if (existingUser) {
        return interaction.editReply({
          content: `⚠️ Le pseudo **${pseudoInput}** est déjà associé à un autre membre sur ce serveur.`,
        });
      }

      let user = await User.findOne({ guildId, userId: interaction.user.id });
      if (!user) {
        user = new User({
          guildId,
          userId: interaction.user.id,
          balance: 0,
          items: [],
        });
      }

      user.minecraftUsername = pseudoInput;
      user.minecraftLinkedAt = new Date();
      await user.save();

      const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(pseudoInput)}/128.png`;

      const embed = new EmbedBuilder()
        .setTitle("⛏️ Compte Minecraft Lié avec Succès !")
        .setDescription(
          `Votre compte Discord <@${interaction.user.id}> est maintenant associé au joueur Minecraft **${pseudoInput}**.\n\n` +
            `🎁 Vous pouvez désormais acheter des récompenses en jeu dans le magasin avec la commande </shop buy:1120000000000000000> ou sur le panel !`,
        )
        .setThumbnail(avatarUrl)
        .setColor(COLORS?.SUCCESS || 0x22c55e)
        .addFields(
          { name: "Joueur Minecraft", value: `\`${pseudoInput}\``, inline: true },
          { name: "Date de liaison", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        )
        .setFooter({ text: "Sparcky Minecraft Integration" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === "unlink") {
      await interaction.deferReply({ ephemeral: true });

      const user = await User.findOne({ guildId, userId: interaction.user.id });
      if (!user || !user.minecraftUsername) {
        return interaction.editReply({
          content: "ℹ️ Vous n'avez actuellement aucun compte Minecraft lié.",
        });
      }

      const previousName = user.minecraftUsername;
      user.minecraftUsername = null;
      user.minecraftLinkedAt = null;
      await user.save();

      return interaction.editReply({
        content: `✅ Votre compte Minecraft **${previousName}** a été délié avec succès.`,
      });
    }

    if (subcommand === "view") {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser("user") || interaction.user;
      const user = await User.findOne({ guildId, userId: targetUser.id }).lean();

      if (!user || !user.minecraftUsername) {
        const isSelf = targetUser.id === interaction.user.id;
        return interaction.editReply({
          content: isSelf
            ? "ℹ️ Vous n'avez lié aucun pseudo Minecraft. Utilisez `/link-mc set pseudo:<votre_pseudo>` pour le faire !"
            : `ℹ️ **${targetUser.username}** n'a lié aucun pseudo Minecraft.`,
        });
      }

      const pseudo = user.minecraftUsername;
      const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(pseudo)}/128.png`;
      const bodyUrl = `https://mc-heads.net/body/${encodeURIComponent(pseudo)}/right`;

      const embed = new EmbedBuilder()
        .setTitle(`⛏️ Profil Minecraft de ${targetUser.username}`)
        .setColor(COLORS?.PRIMARY || 0x6366f1)
        .setThumbnail(avatarUrl)
        .setImage(bodyUrl)
        .addFields(
          { name: "Pseudo In-Game", value: `**${pseudo}**`, inline: true },
          {
            name: "Lié depuis",
            value: user.minecraftLinkedAt
              ? `<t:${Math.floor(new Date(user.minecraftLinkedAt).getTime() / 1000)}:D>`
              : "Inconnue",
            inline: true,
          },
        )
        .setFooter({ text: "Sparcky Minecraft Integration" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
