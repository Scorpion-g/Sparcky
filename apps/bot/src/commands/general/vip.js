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
    const currency = guildConfig?.currencySymbol || "$";

    const isMemberVip = Boolean(
      interaction.member?.roles?.cache?.some(r => {
        const n = r.name.toLowerCase();
        return n.includes("vip") || n.includes("personnage important") || n.includes("légende");
      })
    );

    const embed = new EmbedBuilder()
      .setColor(isMemberVip ? 0xF1C40F : 0x00BCD4)
      .setTitle("👑 Avantages VIP & Paliers de Progression Uchronie")
      .setDescription(
        `Bienvenue dans le guide des récompenses d'**Uchronie** !\n` +
        `Plus vous participez dans le chat, plus vous débloquez de privilèges exclusifs pour profiter à fond du serveur.\n\n` +
        `Statut actuel : ${isMemberVip ? "**🌟 Membre VIP Actif** (tous les avantages débloqués !)" : "**Membre Aventure** (progresse dans le chat pour monter de grade !)"}`
      )
      .addFields(
        {
          name: "🌟 Privilèges Exclusifs du Rôle VIP",
          value:
            `• 💰 **Récompense quotidienne x2 :** gagnez le double d'${currency} chaque jour avec \`/daily\` !\n` +
            `• 💼 **Salaire boosté +50% :** gagnez plus sur chaque mission de travail avec \`/work\`.\n` +
            `• ⚡ **Progression express :** gagnez **+50% d'XP** et **double d'${currency}** sur chaque message envoyé.\n` +
            `• 👑 **Accès au Lounge VIP :** salon textuel et vocal privés pour échanger avec Craftor et Grimdal.\n` +
            `• 🛍️ **Comment l'obtenir ?** Disponible dans la boutique avec \`/shop buy vip_uchronie\` ou lors des giveaways !`
        },
        {
          name: "📈 Avantages débloqués par les Niveaux",
          value:
            `🪵 **Niveau 5 (Aventurier en Bois) :**\n` +
            `└ Droit de changer son pseudo sur le serveur & droit d'envoyer des photos/captures d'écran dans le chat !\n\n` +
            `⛏️ **Niveau 15 (Mineur de Fer) :**\n` +
            `└ Utilisation de tous vos emojis et stickers externes (Nitro) + utilisation du soundboard en vocal !\n\n` +
            `💎 **Niveau 30 (Guerrier de Diamant) :**\n` +
            `└ Création de fils de discussion + rôle affiché séparément dans la liste des membres + accès au salon privé des Guerriers !\n\n` +
            `🌌 **Niveau 50 (Légende en Netherite) :**\n` +
            `└ Voix prioritaire en vocal + rôle affiché tout en haut du serveur + accès à l'ensemble des salons VIP !`
        }
      )
      .setFooter({ text: "Uchronie • Plus tu parles, plus tu gagnes !" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
