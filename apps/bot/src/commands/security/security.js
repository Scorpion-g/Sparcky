const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");
const { COLORS, createSparkyEmbed } = require("../../utils/theme");

module.exports = {
  category: "Security",
  data: new SlashCommandBuilder()
    .setName("security")
    .setDescription("Centre de sécurité et d'auto-modération du serveur")
    .setDescriptionLocalizations({
      fr: "Centre de sécurité et d'auto-modération du serveur",
      "en-US": "Server security and auto-moderation control center",
      "es-ES": "Centro de seguridad y automoderación del servidor",
    })
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild))
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Afficher l'état de tous les modules de sécurité")
        .setDescriptionLocalizations({
          fr: "Afficher l'état de tous les modules de sécurité",
          "en-US": "Show status of all security modules",
          "es-ES": "Mostrar el estado de todos los módulos de seguridad",
        }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("antilink")
        .setDescription("Activer ou désactiver la suppression des liens suspects")
        .setDescriptionLocalizations({
          fr: "Activer ou désactiver la suppression des liens suspects",
          "en-US": "Enable or disable anti-link protection",
          "es-ES": "Activar o desactivar la protección antienlaces",
        })
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("Activer (Vrai) ou Désactiver (Faux)")
            .setDescriptionLocalizations({
              fr: "Activer (Vrai) ou Désactiver (Faux)",
              "en-US": "Enable (True) or Disable (False)",
              "es-ES": "Activar (Verdadero) o Desactivar (Falso)",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("antispam")
        .setDescription("Activer ou désactiver la protection contre le flood / spam")
        .setDescriptionLocalizations({
          fr: "Activer ou désactiver la protection contre le flood / spam",
          "en-US": "Enable or disable anti-spam protection",
          "es-ES": "Activar o desactivar la protección antispam",
        })
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("Activer (Vrai) ou Désactiver (Faux)")
            .setDescriptionLocalizations({
              fr: "Activer (Vrai) ou Désactiver (Faux)",
              "en-US": "Enable (True) or Disable (False)",
              "es-ES": "Activar (Verdadero) o Desactivar (Falso)",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("antiraid")
        .setDescription("Activer ou désactiver le mode confinement anti-raid")
        .setDescriptionLocalizations({
          fr: "Activer ou désactiver le mode confinement anti-raid",
          "en-US": "Enable or disable anti-raid lockdown mode",
          "es-ES": "Activar o desactivar el modo de bloqueo antiraid",
        })
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("Activer (Vrai) ou Désactiver (Faux)")
            .setDescriptionLocalizations({
              fr: "Activer (Vrai) ou Désactiver (Faux)",
              "en-US": "Enable (True) or Disable (False)",
              "es-ES": "Activar (Verdadero) o Desactivar (Falso)",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("antibadwords")
        .setDescription("Activer ou désactiver la censure des mots interdits")
        .setDescriptionLocalizations({
          fr: "Activer ou désactiver la censure des mots interdits",
          "en-US": "Enable or disable bad words filter",
          "es-ES": "Activar o desactivar el filtro de malas palabras",
        })
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("Activer (Vrai) ou Désactiver (Faux)")
            .setDescriptionLocalizations({
              fr: "Activer (Vrai) ou Désactiver (Faux)",
              "en-US": "Enable (True) or Disable (False)",
              "es-ES": "Activar (Verdadero) o Desactivar (Falso)",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("autosanctions")
        .setDescription("Sanctionner automatiquement selon les avertissements reçus")
        .setDescriptionLocalizations({
          fr: "Sanctionner automatiquement selon les avertissements reçus",
          "en-US": "Automatically apply sanctions based on warn thresholds",
          "es-ES": "Aplicar sanciones automáticas según advertencias",
        })
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("Activer (Vrai) ou Désactiver (Faux)")
            .setDescriptionLocalizations({
              fr: "Activer (Vrai) ou Désactiver (Faux)",
              "en-US": "Enable (True) or Disable (False)",
              "es-ES": "Activar (Verdadero) o Desactivar (Falso)",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("logs")
        .setDescription("Définir le salon où seront envoyés les logs de modération")
        .setDescriptionLocalizations({
          fr: "Définir le salon où seront envoyés les logs de modération",
          "en-US": "Set channel for moderation and security logs",
          "es-ES": "Definir canal de registros de moderación",
        })
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Salon textuel pour les logs")
            .setDescriptionLocalizations({
              fr: "Salon textuel pour les logs",
              "en-US": "Text channel for logs",
              "es-ES": "Canal de texto para registros",
            })
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let config = await GuildConfiguration.findOne({ guildId });
    if (!config) {
      config = new GuildConfiguration({ guildId });
    }

    if (subcommand === "status") {
      const logChannel = config.modLogChannel
        ? `<#${config.modLogChannel}>`
        : "*Aucun salon défini*";

      const badwordsCount = config.badWords?.length || 0;

      const formatStatus = (val) => (val ? "🟢 **Activé**" : "🔴 **Désactivé**");

      const embed = createSparkyEmbed({
        title: "🛡️ Tableau de Bord Sécurité & Auto-Modération",
        description: `État actuel des protections actives sur **${interaction.guild.name}** :`,
        color: COLORS.PRIMARY,
        fields: [
          { name: "🔗 Protection Anti-Lien", value: formatStatus(config.antilink), inline: true },
          { name: "⚡ Protection Anti-Spam", value: formatStatus(config.antispam), inline: true },
          { name: "🚨 Confinement Anti-Raid", value: formatStatus(config.antiRaid), inline: true },
          {
            name: "🤬 Mots Interdits (BadWords)",
            value: `${formatStatus(config.antiBadWords)} (${badwordsCount} mot(s))`,
            inline: true,
          },
          {
            name: "⚖️ Sanctions Automatiques",
            value: `${formatStatus(config.autoSanction)}\n*(3 warns = mute, 5 = kick, 7 = ban)*`,
            inline: true,
          },
          { name: "📜 Salon des Logs", value: logChannel, inline: true },
        ],
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === "antilink") {
      const enabled = interaction.options.getBoolean("enabled", true);
      config.antilink = enabled;
      await config.save();

      const embed = createSparkyEmbed({
        title: enabled ? "🔗 Anti-Lien activé" : "🔗 Anti-Lien désactivé",
        description: enabled
          ? "Les liens d'invitation et suspects non autorisés seront désormais automatiquement supprimés."
          : "La détection et suppression des liens a été désactivée.",
        color: enabled ? COLORS.SUCCESS : COLORS.WARNING,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === "antispam") {
      const enabled = interaction.options.getBoolean("enabled", true);
      config.antispam = enabled;
      await config.save();

      const embed = createSparkyEmbed({
        title: enabled ? "⚡ Anti-Spam activé" : "⚡ Anti-Spam désactivé",
        description: enabled
          ? "Les messages répétés et le flood textuel seront automatiquement filtrés et sanctionnés."
          : "La protection anti-spam a été désactivée.",
        color: enabled ? COLORS.SUCCESS : COLORS.WARNING,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === "antiraid") {
      const enabled = interaction.options.getBoolean("enabled", true);
      config.antiRaid = enabled;
      await config.save();

      const embed = createSparkyEmbed({
        title: enabled ? "🚨 Confinement Anti-Raid activé" : "🛡️ Anti-Raid désactivé",
        description: enabled
          ? "⚠️ **Attention :** Le mode confinement est actif. Tout nouvel arrivant suspect sera immédiatement expulsé et consigné dans les logs."
          : "Le mode confinement anti-raid a été levé. Les nouveaux membres peuvent rejoindre normalement.",
        color: enabled ? COLORS.DANGER : COLORS.SUCCESS,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === "antibadwords") {
      const enabled = interaction.options.getBoolean("enabled", true);
      config.antiBadWords = enabled;
      await config.save();

      const embed = createSparkyEmbed({
        title: enabled ? "🤬 Censure des Mots Interdits activée" : "🤬 Censure désactivée",
        description: enabled
          ? `La censure automatique est active (${config.badWords?.length || 0} mot(s) enregistrés). Utilisez \`/badwords\` pour gérer la liste.`
          : "La censure des mots interdits a été désactivée.",
        color: enabled ? COLORS.SUCCESS : COLORS.WARNING,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === "autosanctions") {
      const enabled = interaction.options.getBoolean("enabled", true);
      config.autoSanction = enabled;
      await config.save();

      const embed = createSparkyEmbed({
        title: enabled ? "⚖️ Sanctions Automatiques activées" : "⚖️ Sanctions Automatiques désactivées",
        description: enabled
          ? "Les membres atteignant des seuils d'avertissement seront automatiquement punis :\n• **3 warns** : Expulsion temporaire (Mute / Timeout)\n• **5 warns** : Expulsion du serveur (Kick)\n• **7 warns** : Bannissement définitif (Ban)"
          : "Les sanctions automatiques sont désactivées. Les modérateurs devront appliquer les punitions manuellement.",
        color: enabled ? COLORS.SUCCESS : COLORS.WARNING,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === "logs") {
      const channel = interaction.options.getChannel("channel", true);
      config.modLogChannel = channel.id;
      await config.save();

      const embed = createSparkyEmbed({
        title: "📜 Salon des Logs configuré",
        description: `Les logs de modération et de sécurité seront désormais envoyés dans <#${channel.id}>.`,
        color: COLORS.SUCCESS,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
