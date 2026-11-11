const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const logger = require("../../utils/logger");
const { getGuildLocale } = require("../../utils/getGuildLocale");
const { COLORS, createSparkyEmbed } = require("../../utils/theme");

const CATEGORIES = [
  {
    id: "security",
    name: "Sécurité & Protection",
    emoji: "🛡️",
    desc: "Anti-lien, anti-spam, anti-raid, mots interdits et sanctions automatiques.",
    color: COLORS.DANGER,
    match: ["security", "automoderation"],
  },
  {
    id: "moderation",
    name: "Modération & Sanctions",
    emoji: "⚖️",
    desc: "Bannissement, expulsion, mute, avertissements et purge (/clear).",
    color: COLORS.WARNING,
    match: ["moderation"],
  },
  {
    id: "setup",
    name: "Configuration Serveur",
    emoji: "⚙️",
    desc: "Salons de bienvenue, départ, auto-role, langue et salons vocaux.",
    color: COLORS.PRIMARY,
    match: ["setup", "config", "config_cmds"],
  },
  {
    id: "economy",
    name: "Économie & Niveaux",
    emoji: "🪙",
    desc: "Monnaie virtuelle, daily, work, pile ou face, giveaways et niveaux XP.",
    color: COLORS.SUCCESS,
    match: ["economy"],
  },
  {
    id: "shop",
    name: "Boutique & Rôles",
    emoji: "🛒",
    desc: "Articles et rôles Discord achetables avec vos pièces virtuelles.",
    color: 0xa855f7,
    match: ["shop"],
  },
  {
    id: "fun",
    name: "Mini-Jeux & Blind Test",
    emoji: "🎮",
    desc: "Blind Test musical Deezer en salon vocal et jeux multijoueurs.",
    color: COLORS.INFO,
    match: ["fun"],
  },
  {
    id: "tickets",
    name: "Support & Tickets",
    emoji: "🎫",
    desc: "Système complet de tickets privés et d'assistance des membres.",
    color: 0xec4899,
    match: ["tickets", "ticket"],
  },
  {
    id: "general",
    name: "Utilitaires & Général",
    emoji: "🛠️",
    desc: "Commandes d'information, statut, latence, broadcast et aide.",
    color: COLORS.NEUTRAL,
    match: ["general", "utiles", "misc", "applicationmenu"],
  },
];

function normalizeDiscordLocale(locale) {
  if (!locale || typeof locale !== "string") return "fr";
  if (locale === "en") return "en-US";
  if (locale === "es") return "es-ES";
  return locale;
}

async function getCommandDescriptionForLocale(command, interaction, resolvedLocale) {
  try {
    const json = command?.data?.toJSON?.();
    if (!json) return command?.data?.description;

    const discordLocale = normalizeDiscordLocale(resolvedLocale);

    const fromLocalizations =
      json.description_localizations?.[discordLocale] ||
      json.description_localizations?.[resolvedLocale];
    if (fromLocalizations) return fromLocalizations;

    const fallbackKey = `HELP.COMMANDS.${json.name}.DESC`;
    const translated = await interaction.t?.(fallbackKey).catch?.(() => null);
    if (translated && translated !== fallbackKey) return translated;

    return json.description || "Aucune description disponible";
  } catch {
    return command?.data?.description || "Aucune description disponible";
  }
}

function buildSelectMenu(activeId = "home") {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("help_category_select")
    .setPlaceholder("📂 Choisir une catégorie de commandes...")
    .addOptions([
      {
        label: "Accueil / Vue d'ensemble",
        value: "home",
        description: "Retourner au sommaire principal",
        emoji: "🏠",
        default: activeId === "home",
      },
      ...CATEGORIES.map((cat) => ({
        label: cat.name,
        value: cat.id,
        description: cat.desc.length > 100 ? cat.desc.slice(0, 97) + "..." : cat.desc,
        emoji: cat.emoji,
        default: activeId === cat.id,
      })),
    ]);

  return new ActionRowBuilder().addComponents(selectMenu);
}

function buildQuickLinksRow(clientId) {
  const effectiveId = clientId || process.env.CLIENT_ID || "1275197373580050604";
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Inviter Sparcky")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/oauth2/authorize?client_id=${effectiveId}&permissions=8&scope=bot%20applications.commands`)
      .setEmoji("➕"),
    new ButtonBuilder()
      .setLabel("Dashboard Web")
      .setStyle(ButtonStyle.Link)
      .setURL("https://sparcky.matteoriviere.fr")
      .setEmoji("🌐"),
    new ButtonBuilder()
      .setLabel("Voter (Top.gg)")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://top.gg/bot/${effectiveId}/vote`)
      .setEmoji("⭐")
  );
}

function buildHomeEmbed(categoryCounts, totalCommands) {
  const fields = CATEGORIES.map((cat) => {
    const count = categoryCounts[cat.id] || 0;
    return {
      name: `${cat.emoji} ${cat.name} (${count} commande${count > 1 ? "s" : ""})`,
      value: cat.desc,
      inline: false,
    };
  });

  fields.push(
    {
      name: "🌐 Dashboard Web",
      value: "[sparcky.matteoriviere.fr](https://sparcky.matteoriviere.fr)",
      inline: true,
    },
    {
      name: "🎮 Démo Interactive",
      value: "[sparcky.matteoriviere.fr/demo](https://sparcky.matteoriviere.fr/demo)",
      inline: true,
    },
    {
      name: "🔗 Invitation",
      value: `[Inviter Sparcky](https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID || "1285215781363617872"}&permissions=8&scope=bot%20applications.commands)`,
      inline: true,
    },
  );

  return createSparkyEmbed({
    title: "⚡ God_Sparky • Centre d'Aide & Commandes",
    description:
      "Bienvenue sur l'aide de **God_Sparky** !\n" +
      `Le bot dispose actuellement de **${totalCommands} commandes** prêtes à l'emploi.\n\n` +
      "🔽 **Utilisez le menu déroulant ci-dessous** pour afficher les détails et sous-commandes de chaque catégorie.",
    color: COLORS.PRIMARY,
    fields,
  });
}

async function buildCategoryEmbed(cat, commands, interaction, resolvedLocale) {
  const fields = [];

  for (const cmd of commands) {
    const json = cmd.data.toJSON ? cmd.data.toJSON() : cmd.data;
    const desc = await getCommandDescriptionForLocale(cmd, interaction, resolvedLocale);

    const subcommands = (json.options || []).filter((opt) => opt.type === 1);
    let details = desc || "*(Aucune description)*";

    if (subcommands.length > 0) {
      const subList = subcommands.map((s) => `\`${s.name}\``).join(", ");
      details += `\n> ↳ **Sous-commandes :** ${subList}`;
    }

    fields.push({
      name: `/${json.name}`,
      value: details,
      inline: false,
    });
  }

  if (fields.length === 0) {
    fields.push({
      name: "Aucune commande",
      value: "Aucune commande n'est disponible dans cette catégorie pour le moment.",
      inline: false,
    });
  }

  return createSparkyEmbed({
    title: `${cat.emoji} ${cat.name} • Commandes`,
    description:
      `${cat.desc}\n\n` +
      "*Tapez `/` suivi du nom de la commande pour l'exécuter sur Discord.*",
    color: cat.color,
    fields,
  });
}

module.exports = {
  category: "General",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche le centre d'aide interactif et la liste des commandes")
    .setDescriptionLocalizations({
      fr: "Affiche le centre d'aide interactif et la liste des commandes",
      "en-US": "Display the interactive help center and command list",
      "es-ES": "Muestra el centro de ayuda interactivo y la lista de comandos",
    }),

  async execute(interaction) {
    try {
      const commands = interaction.client.commands || new Map();
      const resolvedLocale = await getGuildLocale({
        guildId: interaction.guildId,
        interaction,
      });

      // Grouper les commandes par catégorie
      const groupedCommands = {};
      const categoryCounts = {};
      CATEGORIES.forEach((cat) => {
        groupedCommands[cat.id] = [];
        categoryCounts[cat.id] = 0;
      });

      commands.forEach((command) => {
        const rawCat = (command.category || "General").toLowerCase();
        const category =
          CATEGORIES.find((c) => c.match.includes(rawCat)) ||
          CATEGORIES[CATEGORIES.length - 1];

        groupedCommands[category.id].push(command);
        categoryCounts[category.id]++;
      });

      // Trier les commandes par ordre alphabétique dans chaque catégorie
      CATEGORIES.forEach((cat) => {
        groupedCommands[cat.id].sort((a, b) =>
          a.data.name.localeCompare(b.data.name),
        );
      });

      const totalCommands = commands.size;
      const homeEmbed = buildHomeEmbed(categoryCounts, totalCommands);
      const row = buildSelectMenu("home");
      const quickLinks = buildQuickLinksRow(interaction.client.user?.id);

      const response = await interaction.reply({
        embeds: [homeEmbed],
        components: [row, quickLinks],
        ephemeral: true,
      });

      // Collecteur pour le menu déroulant interactif
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
      });

      collector.on("collect", async (selectInteraction) => {
        if (selectInteraction.user.id !== interaction.user.id) {
          return selectInteraction.reply({
            content: "Vous ne pouvez pas interagir avec ce menu d'aide.",
            ephemeral: true,
          });
        }

        const selectedValue = selectInteraction.values[0];

        if (selectedValue === "home") {
          return selectInteraction.update({
            embeds: [homeEmbed],
            components: [buildSelectMenu("home"), quickLinks],
          });
        }

        const targetCat = CATEGORIES.find((c) => c.id === selectedValue);
        if (!targetCat) {
          return selectInteraction.update({
            embeds: [homeEmbed],
            components: [buildSelectMenu("home"), quickLinks],
          });
        }

        const catCommands = groupedCommands[targetCat.id] || [];
        const catEmbed = await buildCategoryEmbed(
          targetCat,
          catCommands,
          interaction,
          resolvedLocale,
        );

        return selectInteraction.update({
          embeds: [catEmbed],
          components: [buildSelectMenu(targetCat.id), quickLinks],
        });
      });

      collector.on("end", async () => {
        try {
          const disabledMenu = StringSelectMenuBuilder.from(
            buildSelectMenu("home").components[0],
          ).setDisabled(true);
          const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
          await interaction.editReply({ components: [disabledRow, quickLinks] }).catch(() => {});
        } catch {
          // Ignorer si le message éphémère a expiré
        }
      });
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de la commande help: ${error}`);
      await interaction.reply({
        content: await interaction.t?.("ERRORS.COMMAND_FAILED") || "Une erreur est survenue.",
        ephemeral: true,
      }).catch(() => {});
    }
  },
};
