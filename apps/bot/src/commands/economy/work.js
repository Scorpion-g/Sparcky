const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");

const WORK_COOLDOWN_MS = 60 * 60 * 1000; // 1 heure

const JOBS = [
  "Tu as développé un bot Discord pour une communauté",
  "Tu as fait des heures supplémentaires au bureau",
  "Tu as réparé l'ordinateur de ton voisin",
  "Tu as livré des pizzas à vélo sous la pluie",
  "Tu as streamé sur Twitch et reçu un don généreux",
  "Tu as tondu la pelouse du maire du village",
  "Tu as modéré le serveur toute la nuit avec bravoure",
  "Tu as vendu des créations faites maison sur le marché",
  "Tu as gagné une prime d'assiduité exceptionnelle",
  "Tu as retrouvé le chat perdu du quartier"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Travailler pour gagner un salaire.")
    .setDescriptionLocalizations({
      "en-US": "Work to earn a salary.",
    }),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Cette commande ne peut être utilisée que sur un serveur.",
        ephemeral: true,
      });
      return;
    }

    try {
      const guildId = interaction.guild.id;
      const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
      if (guildConfig && guildConfig.economyEnabled === false) {
        return interaction.reply({
          content: "❌ Le système d'économie est actuellement désactivé sur ce serveur.",
          ephemeral: true,
        });
      }

      await interaction.deferReply();
      const userId = interaction.member.id;
      const minSalary = guildConfig?.workMin ?? 50;
      const maxSalary = Math.max(minSalary, guildConfig?.workMax ?? 250);
      const currencySymbol = guildConfig?.currencySymbol || "$";

      const query = { userId, guildId };
      let user = await User.findOne(query);

      const now = Date.now();

      if (user && user.lastWork) {
        const diff = now - new Date(user.lastWork).getTime();
        if (diff < WORK_COOLDOWN_MS) {
          const remainingMinutes = Math.ceil((WORK_COOLDOWN_MS - diff) / (60 * 1000));
          await interaction.editReply({
            content: `⏳ Vous êtes encore fatigué ! Vous pourrez retravailler dans **${remainingMinutes} minute(s)**.`
          });
          return;
        }
        user.lastWork = new Date();
      } else if (user) {
        user.lastWork = new Date();
      } else {
        user = new User({
          ...query,
          lastWork: new Date(),
        });
      }

      // Calcul du salaire aléatoire entre workMin et workMax
      const earned = Math.floor(Math.random() * (maxSalary - minSalary + 1)) + minSalary;
      user.balance = (user.balance || 0) + earned;
      await user.save();

      const randomJob = JOBS[Math.floor(Math.random() * JOBS.length)];

      const embed = new EmbedBuilder()
        .setColor("#10B981")
        .setTitle("💼 Heure de paie !")
        .setDescription(`${randomJob} et tu as gagné **+${earned} ${currencySymbol}** !`)
        .addFields({
          name: "Nouveau solde",
          value: `**${user.balance} ${currencySymbol}**`,
          inline: true
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`Erreur commande /work: ${err?.message}`);
      await interaction.editReply({
        content: "Une erreur est survenue lors de l'exécution de votre travail."
      });
    }
  },
};
