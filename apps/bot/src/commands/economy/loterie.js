const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getActiveLottery, buyTickets, drawLottery } = require("../../utils/lotteryUtils");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loterie")
    .setDescription("Participer à la loterie communautaire.")
    .setDescriptionLocalizations({
      "en-US": "Participate in the community lottery.",
    })
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Afficher le jackpot en cours, vos chances et la date du tirage.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("buy")
        .setDescription("Acheter un ou plusieurs tickets de loterie.")
        .addIntegerOption((opt) =>
          opt
            .setName("quantite")
            .setDescription("Nombre de tickets à acheter")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("draw")
        .setDescription("[Staff] Déclencher le tirage au sort manuellement.")
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande ne peut être utilisée que sur un serveur.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand() || "info";

    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    if (guildConfig && guildConfig.economyEnabled === false) {
      return interaction.reply({
        content: "❌ Le système d'économie est désactivé sur ce serveur.",
        ephemeral: true,
      });
    }

    // ==========================================
    // 1. ACHAT DE TICKETS (/loterie buy)
    // ==========================================
    if (subcommand === "buy") {
      const count = interaction.options.getInteger("quantite") || 1;
      await interaction.deferReply();

      const result = await buyTickets(userId, guildId, count);

      if (!result.success) {
        if (result.reason === "INSUFFICIENT_FUNDS") {
          return interaction.editReply({
            content: `❌ Solde insuffisant ! ${count} ticket(s) coûtent **${result.needed} pièces**, mais vous ne possédez que **${result.balance} pièces**.`,
          });
        }
        return interaction.editReply({
          content: "❌ Impossible d'acheter des tickets pour le moment.",
        });
      }

      const userPercent = ((result.userTotalTickets / result.totalTickets) * 100).toFixed(1);
      const endTimestamp = Math.floor(new Date(result.endTime).getTime() / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle("🎟️ Achat de Tickets Validé !")
        .setDescription(
          `Vous venez d'acheter **+${result.ticketsBought} ticket(s)** pour un total de **${result.cost} pièces** !\n\n` +
          `🎫 **Vos tickets au total :** \`${result.userTotalTickets}\` (soit **~${userPercent}%** de chances de gagner)\n` +
          `💰 **Nouveau Jackpot Communautaire :** **${result.jackpot.toLocaleString()} pièces** ! 🪙\n` +
          `⏰ **Date du tirage au sort :** <t:${endTimestamp}:f> (<t:${endTimestamp}:R>)`
        )
        .setFooter({ text: "Plus vous avez de tickets, plus vos chances augmentent !" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ==========================================
    // 2. TIRAGE MANUEL STAFF (/loterie draw)
    // ==========================================
    if (subcommand === "draw") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: "❌ Vous devez avoir la permission `Gérer le serveur` pour forcer un tirage.",
          ephemeral: true,
        });
      }

      await interaction.deferReply();
      const lotto = await getActiveLottery(guildId);
      const result = await drawLottery(interaction.client, lotto);

      if (!result || !result.success) {
        return interaction.editReply({
          content: "⚠️ Aucun ticket n'a été acheté pour cette loterie. Le tirage a été reporté.",
        });
      }

      return interaction.editReply({
        content: `✅ Le tirage a été effectué avec succès !\n👑 Gagnant : <@${result.winnerId}>\n💰 Jackpot : **${result.jackpot.toLocaleString()} pièces** sur **${result.totalTickets} tickets** en jeu.`,
      });
    }

    // ==========================================
    // 3. INFORMATIONS (/loterie info)
    // ==========================================
    await interaction.deferReply();
    const lotto = await getActiveLottery(guildId);

    const totalTickets = lotto.tickets.reduce((acc, t) => acc + t.count, 0);
    const userTickets = lotto.tickets.find((t) => t.userId === userId)?.count || 0;
    const userChance = totalTickets > 0 ? ((userTickets / totalTickets) * 100).toFixed(1) : "0.0";
    const endTimestamp = Math.floor(new Date(lotto.endTime).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle("🎰 Loterie Communautaire")
      .setDescription(
        `Achetez des tickets pour faire grimper le jackpot commun ! Le vainqueur tire la totalité de la cagnotte lors du tirage hebdomadaire !\n\n` +
        `💰 **Jackpot Actuel :** **${lotto.jackpot.toLocaleString()} pièces** 🪙\n` +
        `🎟️ **Prix du Ticket :** \`${lotto.ticketPrice} pièces\`\n` +
        `👥 **Total de tickets achetés :** \`${totalTickets}\`\n` +
        `⏰ **Tirage au sort :** <t:${endTimestamp}:f> (<t:${endTimestamp}:R>)\n\n` +
        `👤 **Vos Tickets :** \`${userTickets}\`\n` +
        `🍀 **Vos chances estimées :** \`${userChance}%\``
      )
      .setFooter({ text: "Tapez /loterie buy <quantité> pour tenter votre chance !" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
