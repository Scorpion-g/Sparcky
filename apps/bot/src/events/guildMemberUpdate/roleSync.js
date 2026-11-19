const GuildConfiguration = require("../../models/GuildConfiguration");
const User = require("../../models/User");
const { executeRcon } = require("../../utils/rcon");
const logger = require("../../utils/logger");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberUpdate",
  async execute(client, oldMember, newMember) {
    if (!newMember || !newMember.guild) return;

    try {
      const guildId = newMember.guild.id;
      const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
      if (!guildConfig) return;

      const userDoc = await User.findOne({ guildId, userId: newMember.id }).lean();
      const mcLinked = userDoc?.minecraftUsername || null;

      const rconHost = guildConfig.minecraft?.ip;
      const rconPort = guildConfig.minecraft?.rconPort || 25575;
      const rconPassword = guildConfig.minecraft?.rconPassword;
      const canRunRcon = Boolean(
        guildConfig.minecraft?.enabled &&
        guildConfig.minecraft?.rconEnabled &&
        rconHost &&
        rconPassword
      );

      // ==========================================
      // 1. SYNCHRONISATION DES RÔLES VERS MINECRAFT
      // ==========================================
      if (canRunRcon && mcLinked && Array.isArray(guildConfig.minecraft?.roleSync)) {
        const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

        for (const [roleId, role] of addedRoles) {
          const rule = guildConfig.minecraft.roleSync.find((s) => s.roleId === roleId);
          if (rule) {
            const rawCmd = rule.addCommand || "lp user {player} parent add {group}";
            const finalCmd = rawCmd
              .replace(/\{player\}/gi, mcLinked)
              .replace(/\{group\}/gi, rule.groupName || role.name.toLowerCase());

            try {
              await executeRcon({
                host: rconHost,
                port: rconPort,
                password: rconPassword,
                command: finalCmd,
              });
              logger.info(`[ROLE-SYNC] Grade ajouté sur Minecraft : "${finalCmd}" pour ${mcLinked}`);
            } catch (rconErr) {
              logger.warn(`[ROLE-SYNC] Échec ajout grade pour ${mcLinked}: ${rconErr.message}`);
            }
          }
        }

        for (const [roleId, role] of removedRoles) {
          const rule = guildConfig.minecraft.roleSync.find((s) => s.roleId === roleId);
          if (rule) {
            const rawCmd = rule.removeCommand || "lp user {player} parent remove {group}";
            const finalCmd = rawCmd
              .replace(/\{player\}/gi, mcLinked)
              .replace(/\{group\}/gi, rule.groupName || role.name.toLowerCase());

            try {
              await executeRcon({
                host: rconHost,
                port: rconPort,
                password: rconPassword,
                command: finalCmd,
              });
              logger.info(`[ROLE-SYNC] Grade retiré sur Minecraft : "${finalCmd}" pour ${mcLinked}`);
            } catch (rconErr) {
              logger.warn(`[ROLE-SYNC] Échec retrait grade pour ${mcLinked}: ${rconErr.message}`);
            }
          }
        }
      }

      // ==========================================
      // 2. RÉCOMPENSE AUTOMATIQUE DE BOOST DISCORD
      // ==========================================
      const justBoosted = !oldMember.premiumSince && Boolean(newMember.premiumSince);
      if (justBoosted && guildConfig.minecraft?.boostReward?.enabled) {
        const boostCfg = guildConfig.minecraft.boostReward;

        if (canRunRcon && mcLinked && boostCfg.command) {
          const finalCmd = boostCfg.command.replace(/\{player\}/gi, mcLinked);
          try {
            await executeRcon({
              host: rconHost,
              port: rconPort,
              password: rconPassword,
              command: finalCmd,
            });
            logger.info(`[BOOST-REWARD] Récompense Boost envoyée à ${mcLinked}: ${finalCmd}`);
          } catch (rconErr) {
            logger.warn(`[BOOST-REWARD] Erreur envoi récompense boost: ${rconErr.message}`);
          }
        }

        // Notification publique ou en salon d'annonces
        const announceChannelId = guildConfig.announcementChannel || guildConfig.welcomeChannel;
        const channel = announceChannelId ? newMember.guild.channels.cache.get(announceChannelId) : null;

        if (channel && channel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xF43F5E)
            .setTitle("💎 Nouveau Boost de Serveur !")
            .setDescription(
              `Un immense merci à **${newMember}** qui vient de booster le serveur **${newMember.guild.name}** !\n\n` +
              (mcLinked
                ? `🎁 **Récompense In-Game envoyée :** Les bonus ont été attribués à \`${mcLinked}\` sur Minecraft !`
                : `💡 *Astuce : Liez votre compte Minecraft avec \`/link-mc set <pseudo>\` pour recevoir automatiquement vos récompenses en jeu !*`)
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp();

          channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error(`[guildMemberUpdate] Erreur: ${err.message}`);
    }
  },
};
