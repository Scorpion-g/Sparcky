const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { executeRcon } = require("../../utils/rcon");
const { COLORS, createSparkyEmbed } = require("../../utils/theme");
const logger = require("../../utils/logger");

module.exports = {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("rcon")
    .setDescription("Exécute une commande sur la console Minecraft via RCON (Administrateurs uniquement)")
    .setDescriptionLocalizations({
      fr: "Exécute une commande sur la console Minecraft via RCON (Administrateurs uniquement)",
      "en-US": "Execute a console command on your Minecraft server via RCON (Admins only)",
      "es-ES": "Ejecuta un comando en la consola de Minecraft a través de RCON (Solo administradores)",
    })
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.Administrator))
    .addStringOption((opt) =>
      opt
        .setName("commande")
        .setDescription("Commande Minecraft à exécuter (ex: whitelist add Steve, kick Alex, say Salut)")
        .setDescriptionLocalizations({
          fr: "Commande Minecraft à exécuter (ex: whitelist add Steve, kick Alex, say Salut)",
          "en-US": "Minecraft command to execute (e.g. whitelist add Steve, kick Alex, say Hi)",
          "es-ES": "Comando de Minecraft a ejecutar (ej. whitelist add Steve, kick Alex)",
        })
        .setRequired(true),
    ),

  async execute(interaction) {
    // La réponse est toujours éphémère pour ne pas exposer les retours console en public
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await GuildConfiguration.findOne({
        guildId: interaction.guildId,
      }).lean();

      if (!config?.minecraft?.enabled || !config?.minecraft?.ip) {
        const embed = createSparkyEmbed({
          title: "⛏️ Serveur Minecraft Non Configuré",
          description:
            "Aucun serveur Minecraft n'est actuellement lié à ce Discord.\n\n" +
            "👉 Configurez votre serveur avec `/setup minecraft ip:votre-ip` ou rendez-vous sur le [Panel Web](https://sparcky.matteoriviere.fr).",
          color: COLORS.WARNING,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      if (!config?.minecraft?.rconEnabled || !config?.minecraft?.rconPassword) {
        const embed = createSparkyEmbed({
          title: "🔒 RCON Désactivé ou Non Configuré",
          description:
            "Le protocole RCON n'est pas activé pour ce serveur Discord.\n\n" +
            "Pour exécuter des commandes en jeu depuis Discord ou le web :\n" +
            "1. Activez RCON dans votre fichier `server.properties` (`enable-rcon=true`)\n" +
            "2. Renseignez le mot de passe RCON en toute sécurité sur votre [Panel Web Sparcky](https://sparcky.matteoriviere.fr).",
          color: COLORS.INFO,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const rawCommand = interaction.options.getString("commande").trim();
      const cleanCommand = rawCommand.replace(/^\//, ""); // Enlever le slash initial s'il a été mis par réflexe

      logger.info(`[RCON] Exécution par ${interaction.user.tag} sur ${interaction.guild.name}: "/${cleanCommand}"`);

      const output = await executeRcon({
        host: config.minecraft.ip,
        port: config.minecraft.rconPort || 25575,
        password: config.minecraft.rconPassword,
        command: cleanCommand,
        timeout: 5000,
      });

      const truncatedOutput =
        output.length > 1000 ? output.substring(0, 997) + "..." : output;

      const embed = createSparkyEmbed({
        title: `⚡ Console RCON • ${config.minecraft.name || "Minecraft"}`,
        description: `Commande transmise avec succès au serveur Minecraft.`,
        color: COLORS.SUCCESS,
        fields: [
          {
            name: "⌨️ Commande exécutée",
            value: `\`/${cleanCommand}\``,
            inline: false,
          },
          {
            name: "📜 Réponse du serveur",
            value: `\`\`\`\n${truncatedOutput}\n\`\`\``,
            inline: false,
          },
        ],
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[RCON Error] ${err.message}`);

      let errorMessage = "Échec de l'exécution de la commande RCON.";
      if (err.message.includes("ECONNREFUSED")) {
        errorMessage = "Connexion refusée. Vérifiez que le port RCON est bien ouvert et accessible.";
      } else if (err.message.includes("Password") || err.message.includes("auth")) {
        errorMessage = "Mot de passe RCON incorrect. Mettez-le à jour dans votre Panel Web.";
      } else if (err.message.includes("Timeout")) {
        errorMessage = "Le serveur Minecraft a mis trop de temps à répondre (Timeout).";
      }

      const embed = createSparkyEmbed({
        title: "❌ Échec de la Commande RCON",
        description: `${errorMessage}\n\n*Détail technique : \`${err.message}\`*`,
        color: COLORS.DANGER,
      });

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
