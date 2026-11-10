const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfiguration = require('../../models/GuildConfiguration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badwords')
    .setDescription('Gérer la liste des mots interdits (serveur)')
    .setDescriptionLocalizations({
      "en-US": "Manage the server banned words list",
    })
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.ManageGuild))
    .addSubcommand(sc =>
      sc
        .setName('add')
        .setDescription('Ajouter un mot à la liste')
        .setDescriptionLocalizations({
          "en-US": "Add a word to the list",
        })
        .addStringOption(o =>
          o
            .setName('word')
            .setDescription('Le mot à ajouter à la liste')
            .setDescriptionLocalizations({
              "en-US": "Word to add to the list",
            })
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('remove')
        .setDescription('Supprimer un mot de la liste')
        .setDescriptionLocalizations({
          "en-US": "Remove a word from the list",
        })
        .addStringOption(o =>
          o
            .setName('word')
            .setDescription('Le mot à supprimer de la liste')
            .setDescriptionLocalizations({
              "en-US": "Word to remove from the list",
            })
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('list')
        .setDescription('Afficher la liste des mots interdits')
        .setDescriptionLocalizations({
          "en-US": "Show the banned words list",
        })
    )
    .addSubcommand(sc =>
      sc
        .setName('clear')
        .setDescription('Supprimer tous les mots de la liste')
        .setDescriptionLocalizations({
          "en-US": "Clear the banned words list",
        })
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;

    const cfg = await GuildConfiguration.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true }
    );

    if (sub === 'add') {
      const w = interaction.options.getString('word').trim().toLowerCase();
      if (!w) return interaction.editReply(await interaction.t('BADWORDS.INVALID_WORD'));
      if ((cfg.badWords || []).includes(w)) return interaction.editReply(await interaction.t('BADWORDS.ALREADY_IN_LIST'));
      cfg.badWords = [...(cfg.badWords || []), w];
      await cfg.save();
      return interaction.editReply(await interaction.t('BADWORDS.ADDED', { word: w }));
    }

    if (sub === 'remove') {
      const w = interaction.options.getString('word').trim().toLowerCase();
      if (!cfg.badWords || !cfg.badWords.includes(w)) return interaction.editReply(await interaction.t('BADWORDS.NOT_IN_LIST'));
      cfg.badWords = cfg.badWords.filter(x => x !== w);
      await cfg.save();
      return interaction.editReply(await interaction.t('BADWORDS.REMOVED', { word: w }));
    }

    if (sub === 'list') {
      const list = cfg.badWords || [];
      if (list.length === 0) return interaction.editReply(await interaction.t('BADWORDS.EMPTY_LIST'));
      const chunk = list.join(', ');
      return interaction.editReply({
        content: await interaction.t('BADWORDS.LIST', { count: list.length, words: chunk }),
        ephemeral: true,
      });
    }

    if (sub === 'clear') {
      cfg.badWords = [];
      await cfg.save();
      return interaction.editReply(await interaction.t('BADWORDS.CLEARED'));
    }

    return interaction.editReply(await interaction.t('BADWORDS.UNKNOWN_SUBCOMMAND'));
  }
};
