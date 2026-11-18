const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vip")
    .setDescription("Découvrir les avantages exclusifs du statut VIP et des paliers de niveaux.")
    .setDescriptionLocalizations({
      "en-US": "Discover exclusive VIP perks and level progression benefits.",
    }),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande ne peut être utilisée que sur un serveur.",
        ephemeral: true,
      });
    }

    const guildConfig = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
    const currency = guildConfig?.currencySymbol || "⚡";
    const guildName = interaction.guild.name;

    const isMemberVip = Boolean(
      interaction.member?.roles?.cache?.some(r => {
        const n = r.name.toLowerCase();
        return n.includes("vip") || n.includes("personnage important") || n.includes("légende");
      })
    );

    let levelPerksText = "";
    if (Array.isArray(guildConfig?.levelRoles) && guildConfig.levelRoles.length > 0) {
      const sortedRoles = [...guildConfig.levelRoles].sort((a, b) => a.level - b.level);
      const defaultDescriptions = {
        5: "Droit de changer son pseudo sur le serveur & envoi de photos/fichiers dans le chat",
        15: "Emojis et autocollants externes (Nitro) + Soundboard en vocal",
        30: "Création de fils de discussion + Rôle affiché séparément dans la liste des membres",
        50: "Voix prioritaire en vocal + Rôle affiché au sommet + Accès aux salons VIP",
      };

      levelPerksText = sortedRoles.map(lr => {
        const roleMention = `<@&${lr.roleId}>`;
        const desc = defaultDescriptions[lr.level] || "Avantages exclusifs et privilèges débloqués sur le serveur";
        return `• **Niveau ${lr.level}** (${roleMention}) :\n  └ ${desc}`;
      }).join("\n\n");
    } else {
      levelPerksText =
        `🪵 **Niveau 5 :** Changement de pseudo & envoi de photos/fichiers dans le chat !\n\n` +
        `⛏️ **Niveau 15 :** Emojis/stickers externes Nitro & soundboard en vocal !\n\n` +
        `💎 **Niveau 30 :** Création de fils de discussion & rôle affiché séparément !\n\n` +
        `🌌 **Niveau 50 :** Voix prioritaire en vocal & accès aux salons exclusifs VIP !`;
    }

    const embed = new EmbedBuilder()
      .setColor(isMemberVip ? 0xF1C40F : 0x00BCD4)
      .setTitle(`👑 Avantages VIP & Paliers de Progression • ${guildName}`)
      .setDescription(
        `Bienvenue dans le guide des récompenses de **${guildName}** !\n` +
        `Plus vous participez activement dans le chat, plus vous débloquez de privilèges exclusifs.\n\n` +
        `Statut actuel : ${isMemberVip ? "**🌟 Membre VIP Actif** (tous les avantages débloqués !)" : "**Membre Actif** (progresse dans le chat pour monter de grade !)"}`
      )
      .addFields(
        {
          name: "🌟 Privilèges Exclusifs du Rôle VIP",
          value:
            `• 💰 **Récompense quotidienne x2 :** gagnez le double de ${currency} chaque jour avec \`/daily\` !\n` +
            `• 💼 **Salaire boosté +50% :** gagnez plus sur chaque mission de travail avec \`/work\`.\n` +
            `• ⚡ **Progression express :** gagnez **+50% d'XP** et le **double de ${currency}** sur chaque message envoyé.\n` +
            `• 👑 **Accès aux Salons VIP :** salons textuel et vocal privés pour échanger tranquillement.\n` +
            `• 🛍️ **Comment l'obtenir ?** Disponible dans la boutique avec \`/shop\` ou lors des giveaways et concours !`
        },
        {
          name: "📈 Avantages débloqués par les Niveaux",
          value: levelPerksText
        }
      )
      .setFooter({ text: `${guildName} • Plus tu participes, plus tu gagnes !` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
