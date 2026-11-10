const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("language")
    .setDescription("Changer la langue du bot sur ce serveur")
    .setDescriptionLocalizations({
      "en-US": "Change the bot language in this server",
    })
    .addStringOption((option) =>
      option
        .setName("lang")
        .setDescription("Langue")
        .setDescriptionLocalizations({
          "en-US": "Language",
        })
        .setRequired(true)
        .addChoices(
          { name: "Français", name_localizations: { "en-US": "French" }, value: "fr" },
          { name: "English", name_localizations: { "en-US": "English" }, value: "en" },
        ),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild)),

  async execute(interaction) {
    const lang = interaction.options.getString("lang", true);

    await GuildConfiguration.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { language: lang },
      { upsert: true },
    );

    const title = await interaction.t?.("CONFIG.LANGUAGE.TITLE");
    const desc = await interaction.t?.("CONFIG.LANGUAGE.UPDATED", { language: lang });

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(title || "Langue mise à jour")
      .setDescription(desc || `Langue du bot définie sur: **${lang}**`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
