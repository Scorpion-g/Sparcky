const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const Level = require("../../models/Level");
const logger = require("../../utils/logger");

const REP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 heures

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription("Donner un point de réputation à un membre pour le remercier.")
    .setDescriptionLocalizations({
      "en-US": "Give a reputation point to a member to thank them.",
    })
    .addUserOption((opt) =>
      opt
        .setName("membre")
        .setDescription("Le membre à qui donner un point de réputation")
        .setDescriptionLocalizations({
          "en-US": "The member to give a reputation point to",
        })
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("raison")
        .setDescription("Raison du remerciement (aide, craft, bonne ambiance...)")
        .setDescriptionLocalizations({
          "en-US": "Reason for the thank you",
        })
        .setMaxLength(200)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande ne peut être utilisée que sur un serveur.",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";
    const senderId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (targetUser.id === senderId) {
      return interaction.reply({
        content: "❌ Vous ne pouvez pas vous donner de point de réputation à vous-même !",
        ephemeral: true,
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        content: "❌ Les bots ne peuvent pas recevoir de points de réputation !",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const now = Date.now();
      let sender = await User.findOne({ userId: senderId, guildId });

      if (sender && sender.lastRep) {
        const elapsed = now - new Date(sender.lastRep).getTime();
        if (elapsed < REP_COOLDOWN_MS) {
          const nextRepTimestamp = Math.floor((new Date(sender.lastRep).getTime() + REP_COOLDOWN_MS) / 1000);
          return interaction.editReply({
            content: `⏳ Vous avez déjà donné un point de réputation aujourd'hui !\nVous pourrez à nouveau remercier quelqu'un <t:${nextRepTimestamp}:R>.`,
          });
        }
      }

      if (!sender) {
        sender = new User({ userId: senderId, guildId });
      }
      sender.lastRep = new Date();
      await sender.save();

      // Incrémente la réputation de la cible
      const targetDoc = await User.findOneAndUpdate(
        { userId: targetUser.id, guildId },
        { $inc: { reputation: 1 } },
        { upsert: true, new: true }
      );

      // Bonus : +50 XP pour la personne remerciée, +25 XP pour l'auteur du remerciement
      await Level.findOneAndUpdate({ userId: targetUser.id, guildId }, { $inc: { xp: 50 } }, { upsert: true }).catch(() => {});
      await Level.findOneAndUpdate({ userId: senderId, guildId }, { $inc: { xp: 25 } }, { upsert: true }).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor(0xFBBF24) // Ambre / Or
        .setTitle("🌟 Point de Réputation Accordé !")
        .setDescription(
          `**${interaction.user}** a accordé un point de réputation à **${targetUser}** !\n\n` +
          `💬 **Raison :** *« ${reason} »*\n\n` +
          `🏆 Nouveau score de réputation de ${targetUser} : **${targetDoc.reputation || 1} point(s)** ! 👏`
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setFooter({ text: "Tapez /leaderboard pour voir les membres les plus réputés !" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[REP] Erreur /rep: ${err.message}`);
      return interaction.editReply({
        content: "❌ Une erreur est survenue lors de l'attribution du point de réputation.",
      });
    }
  },
};
