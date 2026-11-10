const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require("../../models/GuildConfiguration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vocchannel")
    .setDescription("Le salon de vocal où créer son propre salon vocal.")
    .setDescriptionLocalizations({
      fr: "Le salon de vocal où créer son propre salon vocal.",
      "en-US": "Base voice channel where users can create their own voice channel",
    })
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "Le salon vocal où les utilisateurs pourront créer leur propre salon.",
        )
        .setDescriptionLocalizations({
          fr: "Le salon vocal où les utilisateurs pourront créer leur propre salon.",
          "en-US": "The voice channel where users can create their own channel",
        })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(BigInt(PermissionFlagsBits.Administrator)),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const channel = interaction.options.getChannel("channel");

    if (channel.type !== 2) {
      return interaction.reply({
        content: await interaction.t("VOICE.CONFIG.INVALID_CHANNEL"),
        ephemeral: true,
      });
    }

    let guildConfig = await GuildConfig.findOne({ guildId });

    if (!guildConfig) {
      guildConfig = new GuildConfig({ guildId, vocChannelId: channel.id });
    } else {
      guildConfig.vocChannelId = channel.id;
    }

    await guildConfig.save();

    const embed = new EmbedBuilder()
      .setTitle(await interaction.t("VOICE.CONFIG.TITLE"))
      .setDescription(
        await interaction.t("VOICE.CONFIG.DESCRIPTION", { channelId: channel.id }),
      )
      .setColor("Green")
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
