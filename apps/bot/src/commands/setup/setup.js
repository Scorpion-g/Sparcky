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
    )
    .addSubcommand((sub) =>
      sub
        .setName("minecraft")
        .setDescription("Lier ou configurer le serveur Minecraft de cette communauté")
        .setDescriptionLocalizations({
          fr: "Lier ou configurer le serveur Minecraft de cette communauté",
          "en-US": "Link or configure the Minecraft server for this community",
          "es-ES": "Vincular o configurar el servidor de Minecraft de esta comunidad",
        })
        .addStringOption((opt) =>
          opt
            .setName("ip")
            .setDescription("Adresse IP ou nom de domaine du serveur Minecraft")
            .setDescriptionLocalizations({
              fr: "Adresse IP ou nom de domaine du serveur Minecraft",
              "en-US": "Minecraft server IP address or domain name",
              "es-ES": "Dirección IP o nombre de dominio del servidor de Minecraft",
            })
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("port")
            .setDescription("Port du serveur Minecraft (par défaut: 25565)")
            .setDescriptionLocalizations({
              fr: "Port du serveur Minecraft (par défaut: 25565)",
              "en-US": "Minecraft server port (default: 25565)",
              "es-ES": "Puerto del servidor de Minecraft (por defecto: 25565)",
            })
            .setMinValue(1)
            .setMaxValue(65535)
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("nom")
            .setDescription("Nom d'affichage du serveur (ex: Uchronie)")
            .setDescriptionLocalizations({
              fr: "Nom d'affichage du serveur (ex: Uchronie)",
              "en-US": "Display name of the server (e.g. Survival, Uchronie)",
              "es-ES": "Nombre para mostrar del servidor (ej. Uchronie)",
            })
            .setRequired(false),
        )
        .addBooleanOption((opt) =>
          opt
            .setName("actif")
            .setDescription("Activer ou désactiver l'intégration Minecraft sur ce Discord")
            .setDescriptionLocalizations({
              fr: "Activer ou désactiver l'intégration Minecraft sur ce Discord",
              "en-US": "Enable or disable Minecraft integration on this Discord",
              "es-ES": "Habilitar o deshabilitar la integración de Minecraft en este Discord",
            })
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
        const mcStatus =
          config.minecraft?.enabled && config.minecraft?.ip
            ? `✅ **${config.minecraft.name || "Minecraft"}** (\`${config.minecraft.ip}${config.minecraft.port && config.minecraft.port !== 25565 ? `:${config.minecraft.port}` : ""}\`)`
            : "❌ Non configuré / Désactivé";

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
            { name: "⛏️ Serveur Minecraft", value: mcStatus, inline: true },
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

      if (subcommand === "minecraft") {
        const ip = interaction.options.getString("ip");
        const port = interaction.options.getInteger("port");
        const name = interaction.options.getString("nom");
        const actif = interaction.options.getBoolean("actif");

        if (!config.minecraft) {
          config.minecraft = {
            enabled: false,
            ip: null,
            port: 25565,
            name: "Serveur Minecraft",
            bedrock: false,
            statusChannelId: null,
            statusMessageId: null,
          };
        }

        // Si explicitement désactivé ou si aucune IP passée et aucune IP existante
        if (actif === false || (!ip && actif === undefined && !config.minecraft.ip)) {
          config.minecraft.enabled = false;
          if (ip === null && actif === false) {
            config.minecraft.ip = null;
          }
          await config.save();

          const embed = createSparkyEmbed({
            title: "⛏️ Intégration Minecraft Désactivée",
            description: "L'intégration du serveur Minecraft a été **désactivée** pour ce serveur Discord.",
            color: COLORS.WARNING,
          });
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (ip) config.minecraft.ip = ip.trim();
        if (port) config.minecraft.port = port;
        if (name) config.minecraft.name = name.trim();
        if (actif !== null && actif !== undefined) {
          config.minecraft.enabled = actif;
        } else if (config.minecraft.ip) {
          config.minecraft.enabled = true;
        }

        await config.save();

        const embed = createSparkyEmbed({
          title: "⛏️ Serveur Minecraft Configuré avec Succès",
          description:
            `Les informations du serveur Minecraft ont été enregistrées pour votre serveur Discord !\n` +
            `Vos membres peuvent désormais utiliser \`/mcstatus\` pour afficher son statut en direct.`,
          color: COLORS.SUCCESS,
          fields: [
            { name: "Nom", value: config.minecraft.name || "Serveur Minecraft", inline: true },
            { name: "Adresse IP", value: `\`${config.minecraft.ip}\``, inline: true },
            { name: "Port", value: `\`${config.minecraft.port || 25565}\``, inline: true },
            { name: "État", value: config.minecraft.enabled ? "🟢 Activé" : "🔴 Désactivé", inline: true },
          ],
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
