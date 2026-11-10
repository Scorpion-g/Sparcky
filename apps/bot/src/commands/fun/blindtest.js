const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { startBlindTest, stopBlindTest, getThemes, isGameActive } = require("../../utils/blindTestManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blindtest")
    .setDescription("Jeu de Blind Test musical dans votre salon vocal")
    .setDescriptionLocalizations({
      fr: "Jeu de Blind Test musical dans votre salon vocal",
      "en-US": "Music Blind Test quiz game in your voice channel",
      "es-ES": "Juego de Blind Test musical en tu canal de voz",
    })
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Démarrer une partie de Blind Test")
        .setDescriptionLocalizations({
          fr: "Démarrer une partie de Blind Test",
          "en-US": "Start a Blind Test game",
          "es-ES": "Iniciar una partida de Blind Test",
        })
        .addStringOption((opt) =>
          opt
            .setName("theme")
            .setDescription("Thème musical de la partie")
            .setDescriptionLocalizations({
              fr: "Thème musical de la partie",
              "en-US": "Musical theme for the game",
              "es-ES": "Tema musical de la partida",
            })
            .setRequired(false)
            .addChoices(
              { name: "🔥 Top Hits (Pop, Variété & International)", value: "hits" },
              { name: "🕺 Années 80 & 90 Nostalgie", value: "80s_90s" },
              { name: "🎤 Rap Français & US", value: "rap" },
              { name: "🏰 Disney & Dessins Animés", value: "disney" },
              { name: "🍿 Films, Bandes Originales & Séries", value: "cinema" },
              { name: "🎮 Anime, Manga & Gaming", value: "anime_gaming" }
            )
        )
        .addIntegerOption((opt) =>
          opt
            .setName("rounds")
            .setDescription("Nombre de manches à jouer")
            .setDescriptionLocalizations({
              fr: "Nombre de manches à jouer",
              "en-US": "Number of rounds to play",
              "es-ES": "Número de rondas",
            })
            .setRequired(false)
            .addChoices(
              { name: "5 manches (Partie Rapide)", value: 5 },
              { name: "10 manches (Standard)", value: 10 },
              { name: "15 manches (Compétition)", value: 15 },
              { name: "20 manches (Marathon)", value: 20 }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stop")
        .setDescription("Arrêter la partie de Blind Test en cours")
        .setDescriptionLocalizations({
          fr: "Arrêter la partie de Blind Test en cours",
          "en-US": "Stop the ongoing Blind Test game",
          "es-ES": "Detener la partida de Blind Test en curso",
        })
    )
    .addSubcommand((sub) =>
      sub
        .setName("themes")
        .setDescription("Afficher la liste des thèmes musicaux disponibles")
        .setDescriptionLocalizations({
          fr: "Afficher la liste des thèmes musicaux disponibles",
          "en-US": "Display list of available music themes",
          "es-ES": "Mostrar la lista de temas musicales disponibles",
        })
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "start") {
      const theme = interaction.options.getString("theme") || "hits";
      const rounds = interaction.options.getInteger("rounds") || 10;
      return startBlindTest(interaction, theme, rounds);
    }

    if (subcommand === "stop") {
      const stopped = stopBlindTest(interaction.guild.id);
      if (!stopped) {
        return interaction.reply({
          content: "❌ Aucune partie de Blind Test n'est actuellement en cours sur ce serveur.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content: "🛑 La partie de Blind Test a été interrompue et le bot a quitté le salon vocal."
      });
    }

    if (subcommand === "themes") {
      const themes = getThemes();
      const themeList = Object.entries(themes)
        .map(([id, t]) => `${t.emoji} **${t.name}** (\`${id}\`)`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🎶 Thèmes Disponibles pour le Blind Test")
        .setDescription(
          `Choisissez votre catégorie musicale préférée lors du lancement avec \`/blindtest start theme:<votre_choix>\` :\n\n` +
          `${themeList}\n\n` +
          `*Tous les extraits audio proviennent du catalogue officiel Deezer avec une qualité sonore HD.*`
        )
        .setColor(0x6366f1)
        .setFooter({ text: "God_Sparky Blind Test" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
