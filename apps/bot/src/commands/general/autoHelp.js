const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const { getGuildLocale } = require("../../utils/getGuildLocale");
const { COLORS, createSparkyEmbed } = require("../../utils/theme");

const CATEGORY_META = {
  Security: { label: "🛡️ Sécurité & Auto-Modération", order: 1 },
  Automoderation: { label: "🛡️ Sécurité & Auto-Modération", order: 1 },
  Moderation: { label: "⚖️ Modération & Sanctions", order: 2 },
  Config: { label: "⚙️ Configuration Serveur", order: 3 },
  Setup: { label: "⚙️ Configuration Serveur", order: 3 },
  Config_cmds: { label: "⚙️ Configuration Serveur", order: 3 },
  Economy: { label: "🪙 Économie & Niveaux", order: 4 },
  Shop: { label: "🛒 Boutique & Rôles", order: 5 },
  Fun: { label: "🎮 Mini-Jeux & Blind Test", order: 6 },
  Ticket: { label: "🎫 Support & Tickets", order: 7 },
  Utiles: { label: "🛠️ Utilitaires & Général", order: 8 },
  Misc: { label: "🛠️ Utilitaires & Général", order: 8 },
  Applicationmenu: { label: "📋 Raccourcis Menu", order: 9 },
};

function normalizeDiscordLocale(locale) {
  if (!locale || typeof locale !== "string") return "fr";
  // DB: "en" -> Discord localizations: "en-US"
  if (locale === "en") return "en-US";
  return locale;
}

async function getCommandDescriptionForLocale(command, interaction, resolvedLocale) {
  try {
    const json = command?.data?.toJSON?.();
    if (!json) return command?.data?.description;

    const discordLocale = normalizeDiscordLocale(resolvedLocale);

    // 1) Description localisée du builder (si présente)
    const fromLocalizations =
      json.description_localizations?.[discordLocale] ||
      json.description_localizations?.[resolvedLocale];
    if (fromLocalizations) return fromLocalizations;

    // 2) Fallback: si on a une clé i18n pour help (optionnel), ex: HELP.COMMANDS.<name>.DESC
    // Ça permet d’avoir un help traduit même pour les commandes qui n’ont pas encore de localizations Discord.
    const fallbackKey = `HELP.COMMANDS.${json.name}.DESC`;
    const translated = await interaction.t?.(fallbackKey).catch?.(() => null);
    if (translated && translated !== fallbackKey) return translated;

    // 3) Dernier fallback
    return json.description;
  } catch {
    return command?.data?.description;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche la liste des commandes")
    .setDescriptionLocalizations({
      fr: "Affiche la liste des commandes",
      "en-US": "Show the list of bot commands",
    }),

  async execute(interaction) {
    try {
      const commands = interaction.client.commands;

      // IMPORTANT: on utilise la langue DB (via getGuildLocale), pas interaction.locale.
      const resolvedLocale = await getGuildLocale({
        guildId: interaction.guildId,
        interaction,
      });

      if (process.env.DEBUG_I18N === "1") {
        logger.info(`[help] resolvedLocale=${resolvedLocale} interaction.locale=${interaction.locale} guild.preferred=${interaction.guild?.preferredLocale}`);
      }

      // Grouper les commandes par catégorie propre
      const groups = new Map();

      commands.forEach((command) => {
        const rawCat = command.category || "Utiles";
        const meta = CATEGORY_META[rawCat] || { label: `📂 ${rawCat}`, order: 99 };
        const label = meta.label;

        if (!groups.has(label)) {
          groups.set(label, { label, order: meta.order, commands: [] });
        }
        groups.get(label).commands.push(command);
      });

      // Trier les catégories selon l'ordre logique
      const sortedGroups = Array.from(groups.values()).sort((a, b) => a.order - b.order);

      const fields = [];
      for (const group of sortedGroups) {
        group.commands.sort((a, b) => a.data.name.localeCompare(b.data.name));

        const cmds = await Promise.all(
          group.commands.map(async (cmd) => {
            const desc = await getCommandDescriptionForLocale(
              cmd,
              interaction,
              resolvedLocale,
            );
            return `\`/${cmd.data.name}\` — ${desc || ""}`;
          }),
        );

        fields.push({
          name: group.label,
          value: cmds.join("\n") || "*(Aucune commande)*",
          inline: false,
        });
      }

      fields.push(
        {
          name: "🌐 Dashboard Web",
          value: "[sparcky.matteoriviere.fr](https://sparcky.matteoriviere.fr)",
          inline: true,
        },
        {
          name: "🔗 Invitation",
          value: `[Inviter Sparcky](https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID || interaction.client.user.id}&permissions=8&scope=bot%20applications.commands)`,
          inline: true,
        },
      );

      const helpEmbed = createSparkyEmbed({
        title: "⚡ God_Sparky • Centre d'Aide & Commandes",
        description:
          "Bienvenue sur l'aide de **God_Sparky** ! Tapez une commande commençant par `/` dans le chat pour l'utiliser.\n\n" +
          "💡 *Astuce : Utilisez `/security status` ou `/setup status` pour configurer le serveur.*",
        color: COLORS.PRIMARY,
        fields,
      });

      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de la commande help: ${error}`);
      await interaction.reply({
        content: await interaction.t("ERRORS.COMMAND_FAILED"),
        ephemeral: true,
      });
    }
  },
};
