const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Giveaway = require("../models/Giveaway");
const User = require("../models/User");
const Level = require("../models/Level");
const logger = require("./logger");

/**
 * Construit l'embed Discord pour un giveaway
 */
function buildGiveawayEmbed(giveaway, isEnded = false, winners = []) {
  const endTimestamp = Math.floor(new Date(giveaway.endTime).getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle(`🎉 GIVEAWAY : ${giveaway.prize}`)
    .setColor(isEnded ? 0x64748b : 0x6366f1)
    .setTimestamp();

  // Détails de la récompense selon le type
  let rewardDetail = "";
  if (giveaway.rewardType === "coins" && giveaway.rewardAmount > 0) {
    rewardDetail = `💰 **Gain automatique :** \`+${giveaway.rewardAmount} pièces\` (crédité au solde)\n`;
  } else if (giveaway.rewardType === "xp" && giveaway.rewardAmount > 0) {
    rewardDetail = `⭐ **Gain automatique :** \`+${giveaway.rewardAmount} XP\` (crédité au niveau)\n`;
  } else if (giveaway.rewardType === "role" && giveaway.rewardRoleId) {
    rewardDetail = `🎭 **Rôle offert :** <@&${giveaway.rewardRoleId}> (attribué automatiquement)\n`;
  }

  if (!isEnded) {
    embed.setDescription(
      `Cliquez sur le bouton **Participer** ci-dessous pour tenter votre chance !\n\n` +
      `🎁 **Lot à gagner :** **${giveaway.prize}**\n` +
      rewardDetail +
      `🏆 **Nombre de gagnant(s) :** \`${giveaway.winnersCount || 1}\`\n` +
      `⏰ **Fin du tirage :** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)\n` +
      (giveaway.hostedBy ? `👤 **Organisé par :** <@${giveaway.hostedBy}>\n` : "") +
      `👥 **Participants actuels :** \`${giveaway.participants?.length || 0}\``
    );
    embed.setFooter({ text: `ID du Giveaway : ${giveaway._id}` });
  } else {
    const finalWinners = winners.length > 0 ? winners : (giveaway.winners || []);
    const winnersMentions =
      finalWinners.length > 0
        ? finalWinners.map((id) => `<@${id}>`).join(", ")
        : "*Aucun participant éligible*";

    embed.setDescription(
      `Ce giveaway est maintenant **terminé** !\n\n` +
      `🎁 **Lot gagné :** **${giveaway.prize}**\n` +
      rewardDetail +
      `🏆 **Gagnant(s) :** ${winnersMentions}\n` +
      (giveaway.hostedBy ? `👤 **Organisé par :** <@${giveaway.hostedBy}>\n` : "") +
      `👥 **Total participants :** \`${giveaway.participants?.length || 0}\``
    );
    embed.setFooter({ text: `Giveaway Terminé • ID : ${giveaway._id}` });
  }

  return embed;
}

/**
 * Construit le bouton interactif de participation
 */
function buildGiveawayButton(giveaway, isEnded = false) {
  const count = giveaway.participants?.length || 0;

  if (isEnded) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_ended_${giveaway._id}`)
        .setLabel(`Terminé (${count} participants)`)
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_join_${giveaway._id}`)
      .setLabel(`Participer (${count})`)
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary)
  );
}

/**
 * Gère le clic sur le bouton de participation
 */
async function handleGiveawayButton(interaction) {
  try {
    // 1. Défération immédiate pour éviter le timeout de 3 secondes Discord (qui affiche "Cette interaction a échoué")
    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    // 2. Extraction robuste de l'ID du giveaway (supporte giveaway_join_ et giveaway_enter_)
    const giveawayId = interaction.customId.replace(/^giveaway_(join|enter)_/, "");

    // Validation ID MongoDB ObjectId
    if (!giveawayId || !giveawayId.match(/^[0-9a-fA-F]{24}$/)) {
      const msg = "⚠️ Identifiant de giveaway invalide ou introuvable.";
      if (interaction.deferred) return interaction.editReply({ content: msg });
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const giveaway = await Giveaway.findById(giveawayId);

    if (!giveaway || giveaway.isEnded) {
      const msg = "⚠️ Ce giveaway est introuvable ou déjà terminé !";
      if (interaction.deferred) return interaction.editReply({ content: msg });
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const userId = interaction.user.id;
    const isParticipating = Array.isArray(giveaway.participants) && giveaway.participants.includes(userId);

    let updatedDoc;
    if (isParticipating) {
      updatedDoc = await Giveaway.findByIdAndUpdate(
        giveawayId,
        { $pull: { participants: userId } },
        { new: true }
      );
    } else {
      updatedDoc = await Giveaway.findByIdAndUpdate(
        giveawayId,
        { $addToSet: { participants: userId } },
        { new: true }
      );
    }

    // 3. Mise à jour visuelle du bouton et de l'embed sur le message Discord d'origine
    if (updatedDoc) {
      try {
        const row = buildGiveawayButton(updatedDoc, false);
        const embed = buildGiveawayEmbed(updatedDoc, false);
        await interaction.message.edit({ embeds: [embed], components: [row] }).catch((err) => {
          logger.warn(`[GIVEAWAY] Impossible d'éditer le message du giveaway ${giveawayId}: ${err?.message}`);
        });
      } catch (editErr) {
        logger.warn(`[GIVEAWAY] Erreur mise à jour message: ${editErr?.message}`);
      }
    }

    // 4. Notification éphémère à l'utilisateur
    if (!isParticipating) {
      const successMsg = `🎉 Félicitations, votre participation pour **${giveaway.prize}** a bien été validée ! Bonne chance ! 🍀\n*(Cliquez à nouveau sur le bouton si vous souhaitez vous retirer du tirage).*`;
      if (interaction.deferred) {
        return interaction.editReply({ content: successMsg });
      }
      return interaction.reply({ content: successMsg, ephemeral: true });
    } else {
      const leaveMsg = `❌ Votre participation au giveaway pour **${giveaway.prize}** a été annulée.`;
      if (interaction.deferred) {
        return interaction.editReply({ content: leaveMsg });
      }
      return interaction.reply({ content: leaveMsg, ephemeral: true });
    }
  } catch (err) {
    logger.error(`[GIVEAWAY] Erreur handleGiveawayButton: ${err?.message}`);
    const errMsg = "❌ Une erreur est survenue lors de l'enregistrement de votre participation.";
    try {
      if (interaction.deferred) {
        return interaction.editReply({ content: errMsg });
      } else if (!interaction.replied) {
        return interaction.reply({ content: errMsg, ephemeral: true });
      }
    } catch (replyErr) {
      logger.error(`[GIVEAWAY] Erreur réponse interaction: ${replyErr?.message}`);
    }
  }
}

/**
 * Distribue automatiquement les récompenses aux gagnants d'un giveaway
 */
async function distributeGiveawayRewards(client, giveaway, winners) {
  if (!winners || winners.length === 0) return { manualRoleWinners: [] };

  const guild = client.guilds.cache.get(giveaway.guildId);
  const manualRoleWinners = [];

  // 1. Récompense en monnaie / économie
  if (giveaway.rewardType === "coins" && giveaway.rewardAmount > 0) {
    for (const winnerId of winners) {
      await User.findOneAndUpdate(
        { guildId: giveaway.guildId, userId: winnerId },
        { $inc: { balance: giveaway.rewardAmount } },
        { upsert: true, new: true }
      ).catch((err) => {
        logger.error(`[GIVEAWAY] Erreur crédit pièces pour ${winnerId}: ${err?.message}`);
      });
    }
    logger.info(`[GIVEAWAY] ${giveaway.rewardAmount} pièces créditées à ${winners.length} gagnant(s).`);
  }

  // 2. Récompense en points d'XP
  if (giveaway.rewardType === "xp" && giveaway.rewardAmount > 0) {
    for (const winnerId of winners) {
      await Level.findOneAndUpdate(
        { guildId: giveaway.guildId, userId: winnerId },
        { $inc: { xp: giveaway.rewardAmount } },
        { upsert: true, new: true }
      ).catch((err) => {
        logger.error(`[GIVEAWAY] Erreur crédit XP pour ${winnerId}: ${err?.message}`);
      });
    }
    logger.info(`[GIVEAWAY] ${giveaway.rewardAmount} XP crédités à ${winners.length} gagnant(s).`);
  }

  // 3. Attribution automatique de rôle Discord
  if (giveaway.rewardType === "role" && giveaway.rewardRoleId && guild) {
    const botMember = guild.members?.me || (guild.members?.fetch ? await guild.members.fetch(client.user?.id).catch(() => null) : null);
    const role = guild.roles?.cache?.get(giveaway.rewardRoleId) || (guild.roles?.fetch ? await guild.roles.fetch(giveaway.rewardRoleId).catch(() => null) : null);

    for (const winnerId of winners) {
      try {
        const member = guild.members?.fetch ? await guild.members.fetch(winnerId).catch(() => null) : null;
        if (!member) {
          logger.warn(`[GIVEAWAY] Gagnant ${winnerId} introuvable sur le serveur.`);
          continue;
        }

        // Vérification de la hiérarchie Discord
        const isOwner = guild.ownerId && member.id === guild.ownerId;
        const memberHighest = member.roles?.highest?.position ?? 0;
        const botHighest = botMember?.roles?.highest?.position ?? Infinity;
        const isHigherOrEqualThanBot = botMember && memberHighest >= botHighest;
        const isRoleHigherThanBot = botMember && role && role.position >= botHighest;

        if (isOwner || isHigherOrEqualThanBot || isRoleHigherThanBot) {
          logger.warn(
            `[GIVEAWAY] Impossible d'attribuer automatiquement le rôle ${role?.name || giveaway.rewardRoleId} à ${member.user?.tag || winnerId} : ` +
            `Hiérarchie Discord (membre ou rôle au-dessus du bot). Attribution manuelle requise.`
          );
          manualRoleWinners.push(winnerId);
        } else {
          if (member.roles?.add) {
            await member.roles.add(giveaway.rewardRoleId).catch((err) => {
              logger.warn(`[GIVEAWAY] Impossible d'attribuer le rôle ${giveaway.rewardRoleId} à ${winnerId}: ${err?.message}`);
              manualRoleWinners.push(winnerId);
            });
          }
        }
      } catch (err) {
        logger.error(`[GIVEAWAY] Erreur attribution rôle ${winnerId}: ${err?.message}`);
        manualRoleWinners.push(winnerId);
      }
    }
    logger.info(`[GIVEAWAY] Rôle ${giveaway.rewardRoleId} traité pour ${winners.length} gagnant(s).`);
  }

  return { manualRoleWinners };
}

/**
 * Construit le message d'annonce des vainqueurs
 */
function buildWinnerAnnouncement(giveaway, winners, manualRoleWinners = []) {
  if (!winners || winners.length === 0) {
    return `😕 Aucun gagnant n'a pu être tiré au sort pour le giveaway **${giveaway.prize}** (aucun participant éligible).`;
  }

  const mentions = winners.map((id) => `<@${id}>`).join(", ");
  let announcement = "";

  if (giveaway.rewardType === "coins" && giveaway.rewardAmount > 0) {
    announcement = `🎉 Félicitations ${mentions} ! Vous remportez **${giveaway.prize}** !\n💰 **+${giveaway.rewardAmount} pièces** ont été créditées directement sur votre solde d'économie ! 🪙`;
  } else if (giveaway.rewardType === "xp" && giveaway.rewardAmount > 0) {
    announcement = `🎉 Félicitations ${mentions} ! Vous remportez **${giveaway.prize}** !\n⭐ **+${giveaway.rewardAmount} points d'XP** ont été ajoutés à votre progression de niveau ! 🆙`;
  } else if (giveaway.rewardType === "role" && giveaway.rewardRoleId) {
    announcement = `🎉 Félicitations ${mentions} ! Vous remportez le rôle <@&${giveaway.rewardRoleId}> !\n🎭 Le rôle vous a été automatiquement attribué sur le serveur ! ✔️`;
  } else {
    announcement = `🎉 Félicitations ${mentions} ! Vous avez remporté le giveaway pour **${giveaway.prize}** ! 🎁`;
  }

  if (manualRoleWinners && manualRoleWinners.length > 0) {
    const manualMentions = manualRoleWinners.map((id) => `<@${id}>`).join(", ");
    announcement += `\n\n⚠️ **Note Staff :** ${manualMentions} possède un rôle supérieur ou égal au bot (ou est le propriétaire du serveur). En raison de la hiérarchie Discord, veuillez lui attribuer le rôle <@&${giveaway.rewardRoleId}> manuellement.`;
  }

  return announcement;
}

/**
 * Termine et tire au sort les gagnants d'un giveaway
 */
async function finishGiveaway(client, giveawayDoc) {
  try {
    const doc = giveawayDoc._id ? giveawayDoc : await Giveaway.findById(giveawayDoc);
    if (!doc || doc.isEnded) return doc;

    const guild = client.guilds.cache.get(doc.guildId);
    const channel = guild?.channels?.cache?.get(doc.channelId);
    const participants = [...(doc.participants || [])];

    // Tirer au sort les gagnants de façon aléatoire et sans doublon
    const winners = [];
    const pool = [...participants];

    const countToPick = Math.min(doc.winnersCount || 1, pool.length);
    while (winners.length < countToPick && pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(randomIndex, 1)[0]);
    }

    doc.winners = winners;
    doc.isEnded = true;
    await doc.save();

    // Distribution automatique des récompenses (Coins, XP, Rôles)
    const { manualRoleWinners } = (await distributeGiveawayRewards(client, doc, winners)) || { manualRoleWinners: [] };

    if (channel && channel.isTextBased()) {
      // Édition du message d'origine
      if (doc.messageId) {
        const message = await channel.messages.fetch(doc.messageId).catch(() => null);
        if (message) {
          const embed = buildGiveawayEmbed(doc, true, winners);
          const row = buildGiveawayButton(doc, true);
          await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
        }
      }

      // Annonce publique des vainqueurs
      const announcement = buildWinnerAnnouncement(doc, winners, manualRoleWinners);
      await channel.send({ content: announcement }).catch(() => {});
    }

    logger.info(`[GIVEAWAY] Tirage terminé pour ${doc.prize} sur le serveur ${guild?.name || doc.guildId} (Gagnants: ${winners.join(", ") || "aucun"})`);
    return doc;
  } catch (err) {
    logger.error(`[GIVEAWAY] Erreur lors de la finalisation: ${err?.message}`);
    return null;
  }
}

/**
 * Relance le tirage au sort (reroll) d'un giveaway déjà terminé
 */
async function rerollGiveaway(client, giveawayDoc) {
  try {
    const doc = giveawayDoc._id ? giveawayDoc : await Giveaway.findById(giveawayDoc);
    if (!doc) return { success: false, reason: "NOT_FOUND" };

    const guild = client.guilds.cache.get(doc.guildId);
    const channel = guild?.channels?.cache?.get(doc.channelId);
    const participants = [...(doc.participants || [])];

    if (participants.length === 0) {
      return { success: false, reason: "NO_PARTICIPANTS" };
    }

    const winners = [];
    const pool = [...participants];
    const countToPick = Math.min(doc.winnersCount || 1, pool.length);
    while (winners.length < countToPick && pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(randomIndex, 1)[0]);
    }

    doc.winners = winners;
    doc.isEnded = true;
    await doc.save();

    // Distribution des gains aux nouveaux gagnants
    const { manualRoleWinners } = (await distributeGiveawayRewards(client, doc, winners)) || { manualRoleWinners: [] };

    if (channel && channel.isTextBased()) {
      if (doc.messageId) {
        const message = await channel.messages.fetch(doc.messageId).catch(() => null);
        if (message) {
          const embed = buildGiveawayEmbed(doc, true, winners);
          const row = buildGiveawayButton(doc, true);
          await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
        }
      }

      const announcement = buildWinnerAnnouncement(doc, winners, manualRoleWinners);
      await channel.send({
        content: `🔄 **Nouveau tirage au sort (Reroll)** pour le giveaway **${doc.prize}** !\n${announcement}`
      }).catch(() => {});
    }

    logger.info(`[GIVEAWAY] Reroll effectué pour ${doc.prize} (Nouveaux gagnants: ${winners.join(", ")})`);
    return { success: true, winners };
  } catch (err) {
    logger.error(`[GIVEAWAY] Erreur reroll: ${err?.message}`);
    return { success: false, reason: err?.message };
  }
}

/**
 * Vérifie périodiquement les giveaways arrivés à expiration
 */
async function checkActiveGiveaways(client) {
  try {
    const now = new Date();
    const expiredGiveaways = await Giveaway.find({
      isEnded: false,
      endTime: { $lte: now }
    });

    for (const g of expiredGiveaways) {
      await finishGiveaway(client, g);
    }
  } catch (err) {
    logger.error(`[GIVEAWAY] Erreur checkActiveGiveaways: ${err?.message}`);
  }
}

module.exports = {
  buildGiveawayEmbed,
  buildGiveawayButton,
  handleGiveawayButton,
  distributeGiveawayRewards,
  buildWinnerAnnouncement,
  finishGiveaway,
  rerollGiveaway,
  checkActiveGiveaways
};
