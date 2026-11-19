const { SlashCommandBuilder } = require("discord.js");
const util = require("minecraft-server-util");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { COLORS, createSparkyEmbed } = require("../../utils/theme");
const logger = require("../../utils/logger");

module.exports = {
  category: "General",
  data: new SlashCommandBuilder()
    .setName("mcstatus")
    .setDescription("Affiche le statut en direct d'un serveur Minecraft (joueurs, version, ping)")
    .setDescriptionLocalizations({
      fr: "Affiche le statut en direct d'un serveur Minecraft (joueurs, version, ping)",
      "en-US": "Displays live Minecraft server status (players, version, ping)",
      "es-ES": "Muestra el estado en vivo de un servidor de Minecraft (jugadores, versión, ping)",
    })
    .addStringOption((opt) =>
      opt
        .setName("ip")
        .setDescription("Adresse IP ou domaine (optionnel, pour tester un serveur libre)")
        .setDescriptionLocalizations({
          fr: "Adresse IP ou domaine (optionnel, pour tester un serveur libre)",
          "en-US": "Server IP or domain (optional, to query any server)",
          "es-ES": "IP o dominio del servidor (opcional, para consultar cualquier servidor)",
        })
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("port")
        .setDescription("Port du serveur Minecraft (par défaut 25565)")
        .setDescriptionLocalizations({
          fr: "Port du serveur Minecraft (par défaut 25565)",
          "en-US": "Minecraft server port (default 25565)",
          "es-ES": "Puerto del servidor de Minecraft (por defecto 25565)",
        })
        .setMinValue(1)
        .setMaxValue(65535)
        .setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("bedrock")
        .setDescription("Interroger un serveur Bedrock (PE) au lieu de Java")
        .setDescriptionLocalizations({
          fr: "Interroger un serveur Bedrock (PE) au lieu de Java",
          "en-US": "Query a Bedrock (PE) server instead of Java",
          "es-ES": "Consultar un servidor Bedrock en lugar de Java",
        })
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const explicitIp = interaction.options.getString("ip");
      const explicitPort = interaction.options.getInteger("port");
      const optionBedrock = interaction.options.getBoolean("bedrock");

      let targetHost = null;
      let targetPort = explicitPort || 25565;
      let targetName = "Serveur Minecraft";
      let isBedrock = optionBedrock || false;

      if (explicitIp) {
        targetHost = explicitIp.trim();
        targetName = targetHost;
      } else {
        const config = await GuildConfiguration.findOne({
          guildId: interaction.guildId,
        }).lean();

        if (!config?.minecraft?.enabled || !config?.minecraft?.ip) {
          const embed = createSparkyEmbed({
            title: "⛏️ Aucun Serveur Minecraft Lié",
            description:
              "Ce serveur Discord n'a pas encore lié son serveur Minecraft !\n\n" +
              "👉 **Administrateurs :** Utilisez `/setup minecraft ip:votre-ip` pour lier le serveur de votre communauté.\n\n" +
              "💡 *Astuce : Vous pouvez aussi interroger n'importe quel serveur public en direct :*\n`/mcstatus ip:play.hypixel.net`",
            color: COLORS.INFO,
          });
          return interaction.editReply({ embeds: [embed] });
        }

        targetHost = config.minecraft.ip;
        targetPort = explicitPort || config.minecraft.port || 25565;
        targetName = config.minecraft.name || "Serveur Minecraft";
        if (optionBedrock === null || optionBedrock === undefined) {
          isBedrock = Boolean(config.minecraft.bedrock);
        }
      }

      const statusFn = isBedrock ? util.statusBedrock : util.status;
      const response = await statusFn(targetHost, targetPort, {
        timeout: 5000,
        enableSRV: true,
      });

      const onlineCount = response.players?.online ?? 0;
      const maxCount = response.players?.max ?? 0;
      const version = response.version?.name || "Inconnue";
      const ping = response.roundTripLatency ?? "?";
      const cleanMotd = response.motd?.clean ? response.motd.clean.trim() : null;

      let playerList = "";
      if (response.players?.sample && response.players.sample.length > 0) {
        playerList = response.players.sample.map((p) => `\`${p.name}\``).join(", ");
        if (onlineCount > response.players.sample.length) {
          playerList += ` *(et ${onlineCount - response.players.sample.length} autres...)*`;
        }
      }

      const fields = [
        {
          name: "🌐 Adresse",
          value: `\`${targetHost}${targetPort !== 25565 ? `:${targetPort}` : ""}\``,
          inline: true,
        },
        {
          name: "👥 Joueurs",
          value: `**${onlineCount}** / ${maxCount}`,
          inline: true,
        },
        {
          name: "📶 Latence",
          value: `${ping} ms`,
          inline: true,
        },
        {
          name: "📦 Version",
          value: `\`${version}\``,
          inline: true,
        },
        {
          name: "🏷️ Type",
          value: isBedrock ? "Bedrock Edition" : "Java Edition",
          inline: true,
        },
      ];

      if (playerList) {
        fields.push({
          name: "🎮 Joueurs Connectés",
          value: playerList,
          inline: false,
        });
      }

      if (cleanMotd) {
        const truncatedMotd =
          cleanMotd.length > 300 ? cleanMotd.substring(0, 297) + "..." : cleanMotd;
        fields.push({
          name: "📜 Description (MOTD)",
          value: `\`\`\`\n${truncatedMotd}\n\`\`\``,
          inline: false,
        });
      }

      const embed = createSparkyEmbed({
        title: `⛏️ ${targetName} • En Ligne`,
        color: COLORS.SUCCESS,
        fields,
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.warn(`Échec de connexion au serveur Minecraft (${err.message})`);

      const embed = createSparkyEmbed({
        title: "⛏️ Serveur Minecraft • Hors Ligne",
        description:
          "Impossible d'établir une connexion avec le serveur Minecraft.\n" +
          "Le serveur est peut-être éteint, en cours de redémarrage ou l'adresse IP est incorrecte.",
        color: COLORS.DANGER,
      });

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
