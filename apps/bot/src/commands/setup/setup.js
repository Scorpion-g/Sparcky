const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");
const { COLORS, createSparkyEmbed } = require("../../utils/theme");

module.exports = {
  category: "Setup",
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configuration générale et salons du serveur")
    .setDescriptionLocalizations({
      fr: "Configuration générale et salons du serveur",
      "en-US": "General server setup and channel configuration",
      "es-ES": "Configuración general del servidor y canales",
    })
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild))
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Affiche l'état de la configuration actuelle du serveur")
        .setDescriptionLocalizations({
          fr: "Affiche l'état de la configuration actuelle du serveur",
          "en-US": "Display current server configuration status",
          "es-ES": "Muestra el estado de la configuración actual",
        }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("welcome")
        .setDescription("Définir ou désactiver le salon des messages de bienvenue")
        .setDescriptionLocalizations({
          fr: "Définir ou désactiver le salon des messages de bienvenue",
          "en-US": "Set or disable the welcome announcement channel",
          "es-ES": "Definir o desactivar el canal de bienvenida",
        })
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Salon textuel de bienvenue (laisser vide pour désactiver)")
            .setDescriptionLocalizations({
              fr: "Salon textuel de bienvenue (laisser vide pour désactiver)",
              "en-US": "Text channel for welcome messages (leave empty to disable)",
              "es-ES": "Canal de texto de bienvenida (dejar vacío para desactivar)",
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("leave")
        .setDescription("Définir ou désactiver le salon des messages de départ")
        .setDescriptionLocalizations({
          fr: "Définir ou désactiver le salon des messages de départ",
          "en-US": "Set or disable the member departure channel",
          "es-ES": "Definir o desactivar el canal de despedidas",
        })
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Salon textuel de départ (laisser vide pour désactiver)")
            .setDescriptionLocalizations({
              fr: "Salon textuel de départ (laisser vide pour désactiver)",
              "en-US": "Text channel for departure messages (leave empty to disable)",
              "es-ES": "Canal de texto de despedida (dejar vacío para desactivar)",
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("autorole")
        .setDescription("Définir ou désactiver le rôle attribué automatiquement aux nouveaux membres")
        .setDescriptionLocalizations({
          fr: "Définir ou désactiver le rôle attribué automatiquement aux nouveaux membres",
          "en-US": "Set or disable auto-role assigned to new members",
          "es-ES": "Definir o desactivar el rol automático para nuevos miembros",
        })
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Rôle Discord à attribuer (laisser vide pour désactiver)")
            .setDescriptionLocalizations({
              fr: "Rôle Discord à attribuer (laisser vide pour désactiver)",
              "en-US": "Discord role to assign (leave empty to disable)",
              "es-ES": "Rol de Discord a asignar (dejar vacío para desactivar)",
            })
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("language")
        .setDescription("Changer la langue du bot sur ce serveur")
        .setDescriptionLocalizations({
          fr: "Changer la langue du bot sur ce serveur",
          "en-US": "Change bot language on this server",
          "es-ES": "Cambiar el idioma del bot en este servidor",
        })
        .addStringOption((opt) =>
          opt
            .setName("lang")
            .setDescription("Langue de réponse du bot")
            .setDescriptionLocalizations({
              fr: "Langue de réponse du bot",
              "en-US": "Bot response language",
              "es-ES": "Idioma de respuesta del bot",
            })
            .setRequired(true)
            .addChoices(
              { name: "🇫🇷 Français", value: "fr" },
              { name: "🇬🇧 English", value: "en" },
              { name: "🇪🇸 Español", value: "es" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("tempvoice")
        .setDescription("Définir ou désactiver le salon hub pour les salons vocaux temporaires")
        .setDescriptionLocalizations({
          fr: "Définir ou désactiver le salon hub pour les salons vocaux temporaires",
          "en-US": "Set or disable the creator voice hub for temporary voice rooms",
          "es-ES": "Definir o desactivar el canal hub para salas de voz temporales",
        })
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Salon vocal créateur (laisser vide pour désactiver)")
            .setDescriptionLocalizations({
              fr: "Salon vocal créateur (laisser vide pour désactiver)",
              "en-US": "Voice channel hub (leave empty to disable)",
              "es-ES": "Canal de voz creador (dejar vacío para desactivar)",
            })
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      let config = await GuildConfiguration.findOne({
        guildId: interaction.guildId,
      });

      if (!config) {
        config = new GuildConfiguration({ guildId: interaction.guildId });
      }

      if (subcommand === "status") {
        const welcome = config.welcomeChannel
          ? `<#${config.welcomeChannel}>`
          : "❌ Désactivé";
        const leave = config.leaveChannel
          ? `<#${config.leaveChannel}>`
          : "❌ Désactivé";
        const autorole = config.autoRole
          ? `<@&${config.autoRole}>`
          : "❌ Désactivé";
        const tempvoice = config.vocChannelId
          ? `<#${config.vocChannelId}>`
          : "❌ Désactivé";
        const langMap = { fr: "🇫🇷 Français", en: "🇬🇧 English", es: "🇪🇸 Español" };
        const lang = langMap[config.language] || config.language || "🇫🇷 Français";

        const embed = createSparkyEmbed({
          title: "⚙️ Configuration Générale du Serveur",
          description:
            "Voici les paramètres de salons et rôles automatiques actuellement configurés sur ce serveur.\n" +
            "Modifiez-les avec `/setup <subcommand>` ou via le [Panel Web](https://sparcky.matteoriviere.fr).",
          color: COLORS.PRIMARY,
          fields: [
            { name: "👋 Salon de Bienvenue", value: welcome, inline: true },
            { name: "🚪 Salon de Départ", value: leave, inline: true },
            { name: "🎭 Rôle Automatique (Auto-Role)", value: autorole, inline: true },
            { name: "🔊 Salons Vocaux Temporaires", value: tempvoice, inline: true },
            { name: "🌐 Langue du Bot", value: lang, inline: true },
          ],
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (subcommand === "welcome") {
        const channel = interaction.options.getChannel("channel");
        config.welcomeChannel = channel ? channel.id : null;
        await config.save();

        const embed = createSparkyEmbed({
          title: "👋 Salon de Bienvenue Mis à Jour",
          description: channel
            ? `Les nouveaux membres seront désormais accueillis dans ${channel} !`
            : "Les messages de bienvenue ont été **désactivés**.",
          color: channel ? COLORS.SUCCESS : COLORS.WARNING,
        });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (subcommand === "leave") {
        const channel = interaction.options.getChannel("channel");
        config.leaveChannel = channel ? channel.id : null;
        await config.save();

        const embed = createSparkyEmbed({
          title: "🚪 Salon de Départ Mis à Jour",
          description: channel
            ? `Les départs de membres seront annoncés dans ${channel} !`
            : "Les annonces de départ ont été **désactivées**.",
          color: channel ? COLORS.SUCCESS : COLORS.WARNING,
        });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (subcommand === "autorole") {
        const role = interaction.options.getRole("role");
        config.autoRole = role ? role.id : null;
        await config.save();

        const embed = createSparkyEmbed({
          title: "🎭 Rôle Automatique Mis à Jour",
          description: role
            ? `Le rôle ${role} sera automatiquement attribué aux nouveaux membres arrivants !`
            : "L'attribution automatique de rôle a été **désactivée**.",
          color: role ? COLORS.SUCCESS : COLORS.WARNING,
        });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (subcommand === "language") {
        const lang = interaction.options.getString("lang");
        config.language = lang;
        await config.save();

        const langLabels = { fr: "🇫🇷 Français", en: "🇬🇧 English", es: "🇪🇸 Español" };
        const embed = createSparkyEmbed({
          title: "🌐 Langue Modifiée",
          description: `La langue du bot a été définie sur **${langLabels[lang] || lang}** pour ce serveur.`,
          color: COLORS.SUCCESS,
        });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (subcommand === "tempvoice") {
        const channel = interaction.options.getChannel("channel");
        config.vocChannelId = channel ? channel.id : null;
        await config.save();

        const embed = createSparkyEmbed({
          title: "🔊 Salons Vocaux Temporaires Mis à Jour",
          description: channel
            ? `Le salon ${channel} est désormais le salon créateur de vocaux temporaires.`
            : "Le système de salons vocaux temporaires a été **désactivé**.",
          color: channel ? COLORS.SUCCESS : COLORS.WARNING,
        });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (err) {
      logger.error(`Erreur commande /setup: ${err.message}`);
      return interaction.reply({
        content: "❌ Une erreur est survenue lors de la configuration.",
        ephemeral: true,
      });
    }
  },
};
