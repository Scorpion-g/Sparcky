const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const { getGuildLocale } = require("../../utils/getGuildLocale");

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

      // Grouper les commandes par catégorie
      const categories = {};
      commands.forEach((command) => {
        const category = command.category || "Autres";
        if (!categories[category]) categories[category] = [];
        categories[category].push(command);
      });

      for (const category in categories) {
        categories[category].sort((a, b) =>
          a.data.name.localeCompare(b.data.name),
        );
      }

      const fields = [];
      for (const category in categories) {
        const cmds = await Promise.all(
          categories[category].map(async (cmd) => {
            const desc = await getCommandDescriptionForLocale(
              cmd,
              interaction,
              resolvedLocale,
            );
            return `\`/${cmd.data.name}\` → ${desc}`;
          }),
        );

        fields.push({
          name: `📂 ${category}`,
          value: cmds.join("\n") || (await interaction.t("HELP.EMPTY_CATEGORY")),
          inline: false,
        });
      }

      const helpEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(await interaction.t("HELP.TITLE"))
        .setDescription(
          [
            await interaction.t("HELP.DESCRIPTION"),
            // Discord affiche les descriptions slash selon la langue du client.
            // Donc si la langue serveur (BDD) diffère, l'utilisateur peut voir une description différente dans l'UI.
            normalizeDiscordLocale(resolvedLocale) !== normalizeDiscordLocale(interaction.locale)
              ? `\n\n${await interaction.t("HELP.LOCALE_NOTE", {
                  serverLocale: normalizeDiscordLocale(resolvedLocale),
                  clientLocale: normalizeDiscordLocale(interaction.locale),
                })}`
              : "",
          ].join(""),
        )
        .addFields(fields)
        .addFields(
          {
            name: await interaction.t("HELP.SUPPORT.TITLE"),
            value: await interaction.t("HELP.SUPPORT.VALUE"),
            inline: true,
          },
          {
            name: await interaction.t("HELP.INVITE.TITLE"),
            value: await interaction.t("HELP.INVITE.VALUE", {
              clientId: process.env.CLIENT_ID,
            }),
            inline: true,
          },
        )
        .setTimestamp();

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
