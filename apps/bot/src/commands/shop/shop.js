const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { v4: uuid } = require("uuid");
const ShopItem = require("../../models/Shop");
const User = require("../../models/User");
const GuildConfiguration = require("../../models/GuildConfiguration");
const { executeRcon } = require("../../utils/rcon");

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
                name: "Minecraft (RCON)",
                name_localizations: {
                  fr: "Minecraft (RCON)",
                  "en-US": "Minecraft (RCON)",
                },
                value: "minecraft",
              },
              {
                name: "Autre",
                name_localizations: { fr: "Autre", "en-US": "Other" },
                value: "other",
              },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("command")
            .setDescription("Commande RCON pour Minecraft (ex: give {player} diamond 5)")
            .setDescriptionLocalizations({
              fr: "Commande RCON pour Minecraft (ex: give {player} diamond 5)",
              "en-US": "RCON command for Minecraft (ex: give {player} diamond 5)",
            })
            .setRequired(false),
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
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Cette commande doit être exécutée sur un serveur.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const guildConfig = await GuildConfiguration.findOne({ guildId }).lean();
    if (guildConfig && guildConfig.economyEnabled === false) {
      return interaction.reply({
        content: "❌ Le système d'économie et de boutique est actuellement désactivé sur ce serveur.",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
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
          const typeBadge =
            item.type === "minecraft"
              ? "⛏️ Minecraft"
              : item.type === "role"
                ? "🎭 Rôle"
                : item.type === "item"
                  ? "📦 Objet"
                  : item.type;

          const extraCmd =
            item.type === "minecraft" && item.minecraftCommand
              ? `\nCommande: \`${item.minecraftCommand}\``
              : "";

          embed.addFields({
            name: `${item.name} - ${item.price} crédits (${typeBadge})`,
            value: `${item.description}\nStock: ${
              item.stock === -1
                ? await interaction.t("SHOP.STOCK.UNLIMITED")
                : item.stock
            }${extraCmd}`,
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

      // --- Logique d'achat Minecraft (RCON) ---
      if (shopItem.type === "minecraft") {
        if (!user.minecraftUsername) {
          return interaction.editReply({
            content:
              "❌ **Compte Minecraft non lié !**\nVous devez d'abord associer votre pseudo Minecraft avec `/link-mc set pseudo:<votre_pseudo>` avant d'acheter cet article.",
          });
        }

        if (!/^[a-zA-Z0-9_.]{3,16}$/.test(user.minecraftUsername)) {
          return interaction.editReply({
            content: "❌ Votre pseudo Minecraft lié contient des caractères invalides.",
          });
        }

        if (
          !guildConfig.minecraft?.rconEnabled ||
          !guildConfig.minecraft?.ip ||
          !guildConfig.minecraft?.rconPassword
        ) {
          return interaction.editReply({
            content:
              "❌ L'intégration RCON Minecraft n'est pas activée ou configurée sur ce serveur Discord. Contactez un administrateur.",
          });
        }

        const templateCmd = shopItem.minecraftCommand || "give {player} diamond 1";
        const finalCmd = templateCmd.replace(/\{player\}/gi, user.minecraftUsername);

        let rconResponse = "";
        try {
          rconResponse = await executeRcon({
            host: guildConfig.minecraft.ip,
            port: guildConfig.minecraft.rconPort || 25575,
            password: guildConfig.minecraft.rconPassword,
            command: finalCmd,
            timeout: 5000,
          });

          // Vérifier si la console Minecraft renvoie un message d'erreur de syntaxe ou de joueur introuvable
          const isErrorResponse =
            /(malformed|unknown command|unknown item|no player was found|player.*not found|incorrect argument|expected|<--\[HERE\])/i.test(
              rconResponse,
            );

          if (isErrorResponse) {
            throw new Error(rconResponse);
          }
        } catch (rconErr) {
          return interaction.editReply({
            content: `❌ **Échec de l'envoi sur Minecraft !**\nLe serveur a répondu : \`${rconErr.message}\`.\n\n*Note : Assurez-vous d'être connecté en jeu si la commande cible votre joueur.* **Aucun crédit n'a été débité.**`,
          });
        }

        // Transaction : déduction des crédits et enregistrement
        user.balance -= shopItem.price;
        user.items.push(shopItem.name);
        if (shopItem.stock > 0) shopItem.stock -= 1;

        await user.save();
        await shopItem.save();

        // Notification discrète en jeu
        try {
          await executeRcon({
            host: guildConfig.minecraft.ip,
            port: guildConfig.minecraft.rconPort || 25575,
            password: guildConfig.minecraft.rconPassword,
            command: `tellraw ${user.minecraftUsername} [{"text":"[Sparcky Boutique] ","color":"gold","bold":true},{"text":"Merci pour votre achat : ${shopItem.name} !","color":"green"}]`,
            timeout: 2000,
          });
        } catch {
          // Ignorer si échec annonce
        }

        const successEmbed = new EmbedBuilder()
          .setTitle("⛏️ Achat Minecraft Réussi !")
          .setColor("#22c55e")
          .setThumbnail(`https://mc-heads.net/avatar/${encodeURIComponent(user.minecraftUsername)}/128.png`)
          .setDescription(
            `Vous avez acheté **${shopItem.name}** pour **${shopItem.price}** crédits !\nLa récompense a été envoyée au joueur **${user.minecraftUsername}** sur le serveur Minecraft.`
          )
          .addFields(
            { name: "Joueur Minecraft", value: `\`${user.minecraftUsername}\``, inline: true },
            { name: "Nouveau solde", value: `${user.balance} crédits`, inline: true },
            { name: "Commande exécutée", value: `\`${finalCmd}\``, inline: false },
            { name: "Réponse serveur", value: `\`${(rconResponse || "OK").slice(0, 150)}\``, inline: false },
          )
          .setFooter({ text: "Sparcky Minecraft Integration" })
          .setTimestamp();

        return interaction.editReply({ embeds: [successEmbed] });
      }

      // --- Logique d'achat standard (rôles, objets, etc.) ---
      user.balance -= shopItem.price;
      user.items.push(shopItem.name);
      if (shopItem.stock > 0) shopItem.stock -= 1;

      await user.save();
      await shopItem.save();

      if (shopItem.type === "role") {
        let role = null;
        if (shopItem.roleId) {
          role = interaction.guild.roles.cache.get(shopItem.roleId);
        }
        if (!role) {
          role = interaction.guild.roles.cache.find(
            (r) => r.name.toLowerCase() === shopItem.name.toLowerCase(),
          );
        }
        if (role) {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (member) {
            await member.roles.add(role).catch(err => {
              console.error("Erreur attribution rôle boutique:", err?.message);
            });
          }
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
      const command = interaction.options.getString("command");

      const newShopItem = new ShopItem({
        itemId: uuid(),
        guildId,
        name,
        price,
        description,
        stock,
        type,
        minecraftCommand:
          type === "minecraft"
            ? (command?.trim() || "give {player} diamond 1")
            : null,
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
