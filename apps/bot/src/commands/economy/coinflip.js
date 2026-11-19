const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { incrementQuestProgress } = require("../../utils/questUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Parier une somme sur un pile ou face.")
    .setDescriptionLocalizations({
      "en-US": "Bet an amount on a coin flip.",
    })
    .addIntegerOption((opt) =>
      opt
        .setName("mise")
        .setDescription("Montant à parier")
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((opt) =>
      opt
        .setName("choix")
        .setDescription("Votre prédiction (pile ou face)")
        .setRequired(true)
        .addChoices(
          { name: "🪙 Pile", value: "pile" },
          { name: "🪙 Face", value: "face" },
        ),
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande doit être exécutée sur un serveur.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    if (guildConfig && guildConfig.economyEnabled === false) {
      return interaction.reply({
        content: "❌ Le système d'économie est actuellement désactivé sur ce serveur.",
        ephemeral: true,
      });
    }

    // 1. Vérification si les jeux de hasard sont autorisés
    if (guildConfig && guildConfig.gamblingEnabled === false) {
      return interaction.reply({
        content: "❌ Les jeux de hasard (pile ou face) sont actuellement désactivés sur ce serveur.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();
    const userId = interaction.member.id;
    const bet = interaction.options.getInteger("mise");
    const choice = interaction.options.getString("choix");
    const currencySymbol = guildConfig?.currencySymbol || "$";

    let user = await User.findOne({ guildId, userId });
    if (!user) {
      user = new User({ guildId, userId, balance: 0, items: [] });
    }

    // 2. Vérification du solde disponible
    if ((user.balance || 0) < bet) {
      return interaction.editReply({
        content: `❌ Vous n'avez pas assez d'argent pour miser **${bet} ${currencySymbol}** ! (Solde actuel : **${user.balance || 0} ${currencySymbol}**)`,
      });
    }

    // 3. Plafond strict de mise (Max Bet anti-ruine / anti-martingale)
    const maxAllowedBet = guildConfig?.gamblingMaxBet ?? 500;
    if (bet > maxAllowedBet) {
      return interaction.editReply({
        content: `❌ **Mise maximale dépassée !**\nLa mise maximale autorisée pour le pile ou face est fixée à **${maxAllowedBet.toLocaleString()} ${currencySymbol}** sur ce serveur.`,
      });
    }

    // 4. Protection anti-All-In (max 50% du solde pour les soldes >= 100)
    if (user.balance >= 100 && bet > Math.floor(user.balance * 0.5)) {
      const safeLimit = Math.floor(user.balance * 0.5);
      return interaction.editReply({
        content: `⚠️ **Mesure de sécurité anti-ruine :**\nVous ne pouvez pas miser plus de **50% de votre solde** en une seule fois (maximum conseillé : **${safeLimit.toLocaleString()} ${currencySymbol}**).`,
      });
    }

    // 5. Cooldown anti-spam / anti-bot
    const cooldownSeconds = guildConfig?.gamblingCooldown ?? 45;
    if (user.lastCoinflip) {
      const elapsedMs = Date.now() - new Date(user.lastCoinflip).getTime();
      const cooldownMs = cooldownSeconds * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        const expiresAt = Math.floor((Date.now() + (cooldownMs - elapsedMs)) / 1000);
        return interaction.editReply({
          content: `⏳ **Doucement sur les paris !**\nVeuillez patienter encore **${remainingSec}s** (<t:${expiresAt}:R>) avant de relancer une pièce.`,
        });
      }
    }

    // 6. Tirage probabiliste avec léger avantage maison (Casino Edge anti-martingale)
    // 4% de chance que la pièce tombe sur la tranche (la maison l'emporte)
    // 48% pour pile, 48% pour face
    const rand = Math.random();
    let result;
    let edgeEvent = false;

    if (rand < 0.04) {
      result = "tranche";
      edgeEvent = true;
    } else if (rand < 0.52) {
      result = "pile";
    } else {
      result = "face";
    }

    const won = !edgeEvent && choice === result;

    if (won) {
      user.balance += bet;
    } else {
      user.balance = Math.max(0, user.balance - bet);
    }

    user.lastCoinflip = new Date();
    await user.save();

    // Progression Quête Journalière ("coinflip")
    incrementQuestProgress(userId, guildId, "coinflip", 1).catch(() => {});

    let embedColor = won ? "#10B981" : "#EF4444";
    let titleText = `🪙 Résultat du Pile ou Face : ${result.toUpperCase()}`;
    let descriptionText = "";

    if (edgeEvent) {
      embedColor = "#F59E0B";
      titleText = `⚠️ Coup du sort ! La pièce est tombée sur la TRANCHE !`;
      descriptionText = `Incroyable ! La pièce a rebondi et s'est arrêtée net sur sa tranche... Le croupier rafle la mise de **-${bet} ${currencySymbol}**.`;
    } else if (won) {
      descriptionText = `🎉 **Gagné !** La pièce est tombée sur **${result}** comme vous l'aviez prédit !\nVous remportez **+${bet.toLocaleString()} ${currencySymbol}** !`;
    } else {
      descriptionText = `💀 **Perdu !** La pièce est tombée sur **${result}**...\nVous perdez votre mise de **-${bet.toLocaleString()} ${currencySymbol}**.`;
    }

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(titleText)
      .setDescription(descriptionText)
      .addFields(
        {
          name: "Mise engagée",
          value: `${bet.toLocaleString()} ${currencySymbol}`,
          inline: true,
        },
        {
          name: "Nouveau solde",
          value: `**${user.balance.toLocaleString()} ${currencySymbol}**`,
          inline: true,
        },
        {
          name: "Prochain lancer",
          value: `<t:${Math.floor(Date.now() / 1000) + cooldownSeconds}:R>`,
          inline: true,
        },
      )
      .setFooter({ text: "Sparcky Casino Équilibré" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
