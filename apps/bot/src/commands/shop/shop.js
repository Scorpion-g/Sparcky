const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { v4: uuid } = require("uuid");
const ShopItem = require("../../models/Shop");
const User = require("../../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Afficher le magasin")
    .setDescriptionLocalizations({
      fr: "Afficher le magasin",
      "en-US": "Show the shop",
    })
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Afficher les informations du magasin")
        .setDescriptionLocalizations({
          fr: "Afficher les informations du magasin",
          "en-US": "Show shop information",
        }),
    )
    .addSubcommand((sub) =>
      sub
        .setName("buy")
        .setDescription("Acheter un article du magasin")
        .setDescriptionLocalizations({
          fr: "Acheter un article du magasin",
          "en-US": "Buy an item from the shop",
        })
        .addStringOption(
          (option) =>
            option
              .setName("item")
              .setDescription("L'article à acheter")
              .setDescriptionLocalizations({
                fr: "L'article à acheter",
                "en-US": "Item to buy",
              })
              .setRequired(true)
              .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Ajouter un article au magasin")
        .setDescriptionLocalizations({
          fr: "Ajouter un article au magasin",
          "en-US": "Add an item to the shop",
        })
        .addStringOption((opt) =>
          opt
            .setName("item")
            .setDescription("Nom de l'article")
            .setDescriptionLocalizations({
              fr: "Nom de l'article",
              "en-US": "Item name",
            })
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("price")
            .setDescription("Prix de l'article")
            .setDescriptionLocalizations({
              fr: "Prix de l'article",
              "en-US": "Item price",
            })
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Description de l'article")
            .setDescriptionLocalizations({
              fr: "Description de l'article",
              "en-US": "Item description",
            })
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Type d'article")
            .setDescriptionLocalizations({
              fr: "Type d'article",
              "en-US": "Item type",
            })
            .setRequired(true)
            .addChoices(
              {
                name: "Rôle",
                name_localizations: { fr: "Rôle", "en-US": "Role" },
                value: "role",
              },
              {
                name: "Objet",
                name_localizations: { fr: "Objet", "en-US": "Item" },
                value: "item",
              },
              {
                name: "Autre",
                name_localizations: { fr: "Autre", "en-US": "Other" },
                value: "other",
              },
            ),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("stock")
            .setDescription("Stock (-1 pour illimité)")
            .setDescriptionLocalizations({
              fr: "Stock (-1 pour illimité)",
              "en-US": "Stock (-1 for unlimited)",
            })
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Supprimer un article du magasin")
        .setDescriptionLocalizations({
          fr: "Supprimer un article du magasin",
          "en-US": "Remove an item from the shop",
        })
        .addStringOption(
          (opt) =>
            opt
              .setName("item")
              .setDescription("Nom de l'article")
              .setDescriptionLocalizations({
                fr: "Nom de l'article",
                "en-US": "Item name",
              })
              .setRequired(true)
              .setAutocomplete(true),
        ),
    ),

  // --- Autocompletion ---
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const guildId = interaction.guild.id;

    const items = await ShopItem.find({ guildId });
    const filtered = items
      .filter((i) => i.name.toLowerCase().includes(focused.toLowerCase()))
      .slice(0, 25)
      .map((i) => ({ name: i.name, value: i.name }));

    await interaction.respond(filtered);
  },

  // --- Exécution des sous-commandes ---
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    if (subcommand === "info") {
      const items = await ShopItem.find({ guildId });
      const embed = new EmbedBuilder()
        .setTitle(await interaction.t("SHOP.INFO.TITLE"))
        .setDescription(await interaction.t("SHOP.INFO.DESCRIPTION"))
        .setColor("#0099ff")
        .setTimestamp();

      if (!items.length) {
        embed.addFields({
          name: await interaction.t("SHOP.INFO.EMPTY.TITLE"),
          value: await interaction.t("SHOP.INFO.EMPTY.VALUE"),
        });
      } else {
        for (const item of items) {
          embed.addFields({
            name: await interaction.t("SHOP.INFO.ITEM.TITLE", {
              name: item.name,
              price: item.price,
              type: item.type,
            }),
            value: await interaction.t("SHOP.INFO.ITEM.VALUE", {
              description: item.description,
              stock: item.stock,
              stockLabel:
                item.stock === -1
                  ? await interaction.t("SHOP.STOCK.UNLIMITED")
                  : `${item.stock}`,
            }),
          });
        }
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === "buy") {
      const itemName = interaction.options.getString("item");
      const shopItem = await ShopItem.findOne({ guildId, name: itemName });

      if (!shopItem)
        return interaction.editReply({
          content: await interaction.t("SHOP.ERRORS.NOT_FOUND"),
        });
      if (shopItem.stock === 0)
        return interaction.editReply({
          content: await interaction.t("SHOP.ERRORS.OUT_OF_STOCK"),
        });

      let user = await User.findOne({ guildId, userId });
      if (!user) user = new User({ guildId, userId, balance: 0, items: [] });

      if (user.balance < shopItem.price)
        return interaction.editReply({
          content: await interaction.t("SHOP.ERRORS.INSUFFICIENT_FUNDS"),
        });

      user.balance -= shopItem.price;
      user.items.push(shopItem.name);
      if (shopItem.stock > 0) shopItem.stock -= 1;

      await user.save();
      await shopItem.save();

      if (shopItem.type === "role") {
        const role = interaction.guild.roles.cache.find(
          (r) => r.name === shopItem.name,
        );
        if (role) {
          const member = await interaction.guild.members.fetch(userId);
          await member.roles.add(role);
        }
      }

      return interaction.editReply({
        content: await interaction.t("SHOP.BUY.SUCCESS", {
          name: shopItem.name,
          price: shopItem.price,
        }),
      });
    }

    if (subcommand === "add") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.editReply({
          content: await interaction.t("SHOP.ERRORS.NO_PERMISSION_ADD"),
        });
      }
      const name = interaction.options.getString("item");
      const price = interaction.options.getInteger("price");
      const description = interaction.options.getString("description");
      const stock = interaction.options.getInteger("stock") ?? -1;
      const type = interaction.options.getString("type");

      const newShopItem = new ShopItem({
        itemId: uuid(),
        guildId,
        name,
        price,
        description,
        stock,
        type,
      });

      await newShopItem.save();

      return interaction.editReply({
        content: await interaction.t("SHOP.ADD.SUCCESS", {
          name,
          price,
          stockLabel:
            stock === -1
              ? await interaction.t("SHOP.STOCK.UNLIMITED")
              : `${stock}`,
        }),
      });
    }

    if (subcommand === "remove") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.editReply({
          content: await interaction.t("SHOP.ERRORS.NO_PERMISSION_REMOVE"),
        });
      }
      const itemName = interaction.options.getString("item");
      const shopItem = await ShopItem.findOne({ guildId, name: itemName });

      if (!shopItem)
        return interaction.editReply({
          content: await interaction.t("SHOP.ERRORS.NOT_FOUND"),
        });

      await ShopItem.deleteOne({ guildId, name: itemName });

      return interaction.editReply({
        content: await interaction.t("SHOP.REMOVE.SUCCESS", { name: itemName }),
      });
    }

    return interaction.editReply({
      content: await interaction.t("ERRORS.COMMAND_FAILED"),
    });
  },
};
