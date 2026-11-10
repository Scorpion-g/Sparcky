const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");

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
        .setMinValue(1)
    )
    .addStringOption((opt) =>
      opt
        .setName("choix")
        .setDescription("Votre prédiction (pile ou face)")
        .setRequired(true)
        .addChoices(
          { name: "🪙 Pile", value: "pile" },
          { name: "🪙 Face", value: "face" }
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande doit être exécutée sur un serveur.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const guildId = interaction.guild.id;
    const userId = interaction.member.id;
    const bet = interaction.options.getInteger("mise");
    const choice = interaction.options.getString("choix");

    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    const currencySymbol = guildConfig?.currencySymbol || "$";

    let user = await User.findOne({ guildId, userId });
    if (!user || (user.balance || 0) < bet) {
      return interaction.editReply({
        content: `❌ Vous n'avez pas assez d'argent pour miser **${bet} ${currencySymbol}** ! (Solde actuel: **${user?.balance || 0} ${currencySymbol}**)`
      });
    }

    const outcomes = ["pile", "face"];
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];
    const won = choice === result;

    if (won) {
      user.balance += bet;
    } else {
      user.balance = Math.max(0, user.balance - bet);
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setColor(won ? "#10B981" : "#EF4444")
      .setTitle(`🪙 Résultat du Pile ou Face : ${result.toUpperCase()}`)
      .setDescription(
        won
          ? `🎉 **Gagné !** La pièce est tombée sur **${result}** comme prédit ! Vous remportez **+${bet} ${currencySymbol}**.`
          : `💀 **Perdu !** La pièce est tombée sur **${result}**... Vous perdez votre mise de **-${bet} ${currencySymbol}**.`
      )
      .addFields({
        name: "Nouveau solde",
        value: `**${user.balance} ${currencySymbol}**`,
        inline: true
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
