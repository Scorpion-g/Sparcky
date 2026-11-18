const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");
const logger = require("../../utils/logger");
const { attachT } = require("../../utils/t");
const GuildConfiguration = require("../../models/GuildConfiguration");
const FormSubmission = require("../../models/FormSubmission");

module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    // Attache le helper i18n
    attachT(interaction);

    // ==========================================
    // 1. GESTION DES BOUTONS
    // ==========================================
    if (interaction.isButton()) {
      // 1.1 Giveaways
      if (
        interaction.customId.startsWith("giveaway_join_") ||
        interaction.customId.startsWith("giveaway_enter_")
      ) {
        const { handleGiveawayButton } = require("../../utils/giveawayUtils");
        return handleGiveawayButton(interaction);
      }

      // 1.2 Rôles par Réaction (Boutons simples)
      if (interaction.customId.startsWith("role_react_")) {
        const roleId = interaction.customId.replace("role_react_", "");
        const role =
          interaction.guild.roles.cache.get(roleId) ||
          (await interaction.guild.roles.fetch(roleId).catch(() => null));

        if (!role) {
          return interaction.reply({
            content: await interaction.t("ERRORS.ROLE_NOT_FOUND"),
            ephemeral: true,
          });
        }

        try {
          if (interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
            await interaction.reply({
              content: await interaction.t("SUCCESS.ROLE_REMOVED", {
                role: role.name,
              }),
              ephemeral: true,
            });
          } else {
            await interaction.member.roles.add(role);
            await interaction.reply({
              content: await interaction.t("SUCCESS.ROLE_ADDED", {
                role: role.name,
              }),
              ephemeral: true,
            });
          }
        } catch (error) {
          await interaction.reply({
            content: await interaction.t("ERRORS.CANNOT_EDIT_ROLES"),
            ephemeral: true,
          });
          logger.error("Erreur lors de l'ajout/retrait de rôle :", error);
        }
        return;
      }

      // 1.3 Form Builder : Ouverture du Modal
      if (interaction.customId.startsWith("form_open_")) {
        const formId = interaction.customId.replace("form_open_", "");
        const cfg = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
        const form = cfg?.forms?.find(f => f.id === formId);

        if (!form) {
          return interaction.reply({
            content: "❌ Ce formulaire n'est plus actif ou a été supprimé.",
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId(`form_submit_${form.id}`)
          .setTitle((form.title || "Formulaire").slice(0, 45));

        const fields = Array.isArray(form.fields) ? form.fields.slice(0, 5) : [];
        for (const f of fields) {
          const input = new TextInputBuilder()
            .setCustomId(f.id)
            .setLabel((f.label || "Question").slice(0, 45))
            .setStyle(f.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(f.required !== false);

          if (f.placeholder) input.setPlaceholder(f.placeholder.slice(0, 100));
          if (f.minLength) input.setMinLength(f.minLength);
          if (f.maxLength) input.setMaxLength(f.maxLength);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
        }

        return interaction.showModal(modal);
      }

      // 1.4 Form Builder : Traitement Staff (Accepter / Refuser)
      if (interaction.customId.startsWith("form_accept_") || interaction.customId.startsWith("form_refuse_")) {
        const isAccept = interaction.customId.startsWith("form_accept_");
        const submissionId = interaction.customId.replace(isAccept ? "form_accept_" : "form_refuse_", "");

        // Vérification des permissions du membre (ManageGuild ou Administrateur)
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({
            content: "❌ Vous devez avoir la permission de gérer le serveur pour traiter cette candidature.",
            ephemeral: true
          });
        }

        await interaction.deferUpdate();

        try {
          const submission = await FormSubmission.findById(submissionId);
          if (!submission) {
            return interaction.followUp({ content: "❌ Candidature introuvable.", ephemeral: true });
          }

          if (submission.status !== "pending") {
            return interaction.followUp({
              content: `ℹ️ Cette candidature a déjà été traitée (${submission.status === "accepted" ? "Acceptée" : "Refusée"} par ${submission.reviewedByName || "un modérateur"}).`,
              ephemeral: true
            });
          }

          const cfg = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
          const form = cfg?.forms?.find(f => f.id === submission.formId);

          let roleNotice = "";
          // Si acceptée et un rôle automatique est configuré
          if (isAccept && form?.roleToGiveOnAccept) {
            const role = interaction.guild.roles.cache.get(form.roleToGiveOnAccept);
            if (role) {
              const targetMember = await interaction.guild.members.fetch(submission.userId).catch(() => null);
              if (targetMember) {
                await targetMember.roles.add(role).catch(err => {
                  logger.warn(`Impossible d'attribuer le rôle formulaire ${role.name}: ${err?.message}`);
                });
                roleNotice = ` (Rôle <@&${role.id}> attribué)`;
              }
            }
          }

          // Mise à jour en base
          submission.status = isAccept ? "accepted" : "refused";
          submission.reviewedBy = interaction.user.id;
          submission.reviewedByName = interaction.user.tag;
          submission.reviewedAt = new Date();
          await submission.save();

          // Mise à jour de l'embed staff
          const oldEmbed = interaction.message.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(isAccept ? 0x10B981 : 0xEF4444)
            .setFooter({
              text: `${isAccept ? "✅ Acceptée" : "❌ Refusée"} par ${interaction.user.tag}${roleNotice} • ID: ${submission._id}`
            });

          // Désactiver les boutons
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("done_accepted")
              .setLabel(isAccept ? "Acceptée ✔️" : "Acceptée")
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId("done_refused")
              .setLabel(!isAccept ? "Refusée ✖️" : "Refuser")
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true)
          );

          await interaction.message.edit({ embeds: [newEmbed], components: [disabledRow] });

          // Tenter d'envoyer un message privé au candidat
          const candidate = await client.users.fetch(submission.userId).catch(() => null);
          if (candidate) {
            const dmEmbed = new EmbedBuilder()
              .setColor(isAccept ? 0x10B981 : 0xEF4444)
              .setTitle(`Candidature ${form?.title || "Formulaire"} • ${interaction.guild.name}`)
              .setDescription(
                isAccept
                  ? `🎉 Félicitations ! Votre candidature pour **${form?.title || "le formulaire"}** a été **acceptée** par le staff d'**${interaction.guild.name}** !${roleNotice ? `\nVous avez reçu le rôle associé.` : ""}`
                  : `Votre candidature pour **${form?.title || "le formulaire"}** sur **${interaction.guild.name}** n'a pas été retenue.`
              )
              .setTimestamp();
            candidate.send({ embeds: [dmEmbed] }).catch(() => {});
          }

          return;
        } catch (err) {
          logger.error("[FORM_REVIEW] Erreur traitement staff formulaire:", err);
        }
        return;
      }

      return;
    }

    // ==========================================
    // 2. GESTION DES SOUMISSIONS DE MODALS (Form Builder)
    // ==========================================
    if (interaction.isModalSubmit() && interaction.customId.startsWith("form_submit_")) {
      const formId = interaction.customId.replace("form_submit_", "");
      await interaction.deferReply({ ephemeral: true });

      try {
        const cfg = await GuildConfiguration.findOne({ guildId: interaction.guild.id }).lean();
        const form = cfg?.forms?.find(f => f.id === formId);

        if (!form) {
          return interaction.editReply({ content: "❌ Formulaire introuvable ou archivé." });
        }

        const answers = [];
        const fields = Array.isArray(form.fields) ? form.fields : [];
        for (const f of fields) {
          let val = "";
          try {
            val = interaction.fields.getTextInputValue(f.id);
          } catch {
            val = "";
          }
          answers.push({
            fieldId: f.id,
            label: f.label,
            value: val
          });
        }

        // Enregistrer la candidature en base de données
        const submission = new FormSubmission({
          guildId: interaction.guild.id,
          formId: form.id,
          userId: interaction.user.id,
          username: interaction.user.tag,
          userAvatar: interaction.user.displayAvatarURL(),
          answers,
          status: "pending",
          channelId: form.targetChannelId
        });
        await submission.save();

        // Envoyer la notification dans le salon staff configuré
        const staffChannel = interaction.guild.channels.cache.get(form.targetChannelId);
        if (staffChannel && staffChannel.isTextBased()) {
          const staffEmbed = new EmbedBuilder()
            .setColor(0x6366F1)
            .setTitle(`📋 Nouvelle Candidature : ${form.title}`)
            .setDescription(`Soumise par ${interaction.user} (\`${interaction.user.tag}\`)\nCompte créé le : <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:d>`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: `ID Candidature : ${submission._id}` })
            .setTimestamp();

          for (const ans of answers) {
            staffEmbed.addFields({
              name: ans.label.slice(0, 256),
              value: (ans.value || "*Non renseigné*").slice(0, 1024),
              inline: false
            });
          }

          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`form_accept_${submission._id}`)
              .setLabel("Accepter")
              .setStyle(ButtonStyle.Success)
              .setEmoji("✅"),
            new ButtonBuilder()
              .setCustomId(`form_refuse_${submission._id}`)
              .setLabel("Refuser")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("❌")
          );

          const sentMsg = await staffChannel.send({ embeds: [staffEmbed], components: [actionRow] }).catch(err => {
            logger.warn(`Impossible d'envoyer l'embed staff candidature: ${err?.message}`);
          });

          if (sentMsg) {
            submission.messageId = sentMsg.id;
            await submission.save();
          }
        }

        return interaction.editReply({
          content: "✅ **Votre candidature a été transmise avec succès au staff !** Vous recevrez une réponse prochainement."
        });
      } catch (err) {
        logger.error("[FORM_SUBMIT] Erreur soumission formulaire:", err);
        return interaction.editReply({
          content: "❌ Une erreur est survenue lors de l'envoi de votre formulaire."
        });
      }
    }

    // ==========================================
    // 3. GESTION DES MENUS DÉROULANTS DE RÔLES (SELECT MENU)
    // ==========================================
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("role_select_")) {
      await interaction.deferReply({ ephemeral: true });

      try {
        const member = interaction.member;
        const allOptionRoleIds = interaction.component.options.map((opt) => opt.value);
        const selectedRoleIds = interaction.values;

        const addedRoles = [];
        const removedRoles = [];

        for (const roleId of allOptionRoleIds) {
          const role =
            interaction.guild.roles.cache.get(roleId) ||
            (await interaction.guild.roles.fetch(roleId).catch(() => null));
          if (!role) continue;

          const isSelected = selectedRoleIds.includes(roleId);
          const hasRole = member.roles.cache.has(roleId);

          if (isSelected && !hasRole) {
            await member.roles.add(role).catch((err) => {
              logger.warn(`Impossible d'ajouter le rôle ${role.name}: ${err?.message}`);
            });
            addedRoles.push(role.name);
          } else if (!isSelected && hasRole) {
            await member.roles.remove(role).catch((err) => {
              logger.warn(`Impossible de retirer le rôle ${role.name}: ${err?.message}`);
            });
            removedRoles.push(role.name);
          }
        }

        let replyMsg = "✅ **Vos rôles ont été mis à jour avec succès !**\n";
        if (addedRoles.length > 0) {
          replyMsg += `• ➕ **Ajouté(s) :** ${addedRoles.join(", ")}\n`;
        }
        if (removedRoles.length > 0) {
          replyMsg += `• ➖ **Retiré(s) :** ${removedRoles.join(", ")}\n`;
        }
        if (addedRoles.length === 0 && removedRoles.length === 0) {
          replyMsg += `• *Aucune modification apportée à vos rôles.*`;
        }

        return interaction.editReply({ content: replyMsg });
      } catch (error) {
        logger.error("[ROLE_SELECT] Erreur traitement select menu rôles:", error);
        return interaction.editReply({
          content: "❌ Une erreur est survenue lors de la mise à jour de vos rôles.",
        });
      }
    }
  },
};
