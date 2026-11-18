const { EmbedBuilder } = require("discord.js");
const GuildConfiguration = require("../../models/GuildConfiguration");
const logger = require("../../utils/logger");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild || message.author.bot) return;

    try {
      const guildId = message.guild.id;
      const config = await GuildConfiguration.findOne({ guildId }).lean();
      if (!config || !Array.isArray(config.customCommands) || config.customCommands.length === 0) {
        return;
      }

      const content = message.content.trim().toLowerCase();

      for (const cmd of config.customCommands) {
        if (!cmd || cmd.enabled === false || !cmd.trigger || !cmd.response) continue;

        const trigger = cmd.trigger.trim().toLowerCase();
        let matched = false;

        if (cmd.matchType === "startsWith") {
          matched = content.startsWith(trigger);
        } else if (cmd.matchType === "contains") {
          matched = content.includes(trigger);
        } else {
          // Exact match (par défaut)
          matched = content === trigger;
        }

        if (matched) {
          // Remplacement des variables dynamiques
          const formatText = (str) => {
            if (!str) return "";
            return str
              .replace(/{user}/g, `<@${message.author.id}>`)
              .replace(/{username}/g, message.author.username)
              .replace(/{server}/g, message.guild.name)
              .replace(/{memberCount}/g, String(message.guild.memberCount || 0))
              .replace(/{channel}/g, `<#${message.channel.id}>`);
          };

          const formattedResponse = formatText(cmd.response);

          if (cmd.isEmbed) {
            const hex = (cmd.embedColor || "#6366F1").replace("#", "");
            const colorInt = Number.parseInt(hex, 16) || 0x6366f1;

            const embed = new EmbedBuilder()
              .setColor(colorInt)
              .setDescription(formattedResponse)
              .setTimestamp();

            if (cmd.embedTitle) {
              embed.setTitle(formatText(cmd.embedTitle));
            }

            await message.channel.send({ embeds: [embed] });
          } else {
            await message.channel.send({ content: formattedResponse });
          }

          // Un seul déclenchement par message pour éviter le flood
          break;
        }
      }
    } catch (err) {
      logger.error("Erreur dans customCommands messageCreate:", err);
    }
  },
};
