const GuildConfiguration = require("../../models/GuildConfiguration");
const User = require("../../models/User");
const Level = require("../../models/Level");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild || message.author.bot) return;

    try {
      const chName = message.channel.name.toLowerCase();
      const isCountingChannelName = chName.includes("compteur") || chName.includes("counting");

      const guildConfig = await GuildConfiguration.findOne({ guildId: message.guild.id }).lean();
      const configuredChannelId = guildConfig?.counting?.channelId;

      // Vérifier si le salon actuel est le salon compteur
      if (!isCountingChannelName && configuredChannelId !== message.channel.id) {
        return;
      }

      // Si le module compteur est explicitement désactivé
      if (guildConfig?.counting?.enabled === false) return;

      const trimmed = message.content.trim();
      const match = trimmed.match(/^(\d+)$/);

      // Si ce n'est pas un nombre, supprimer et alerter poliment pour garder le salon propre
      if (!match) {
        try {
          const warn = await message.reply("⚠️ Ce salon est dédié au jeu du compteur ! Veuillez envoyer uniquement des nombres entiers.");
          setTimeout(() => warn.delete().catch(() => {}), 3500);
          setTimeout(() => message.delete().catch(() => {}), 3500);
        } catch {}
        return;
      }

      const num = parseInt(match[1], 10);
      const currentExpected = guildConfig?.counting?.currentNumber || 1;
      const lastUser = guildConfig?.counting?.lastUserId || null;
      const currentRecord = guildConfig?.counting?.record || 0;

      // 1. Même joueur deux fois d'affilée
      if (lastUser === message.author.id) {
        await message.react("❌").catch(() => {});
        await message.channel.send(
          `❌ **${message.author}** a compté deux fois de suite ! Le compteur est réinitialisé à **1**.\n🏆 Record du serveur : **${currentRecord}**`
        );
        await GuildConfiguration.updateOne(
          { guildId: message.guild.id },
          {
            $set: {
              "counting.currentNumber": 1,
              "counting.lastUserId": null,
              "counting.channelId": message.channel.id
            }
          },
          { upsert: true }
        );
        return;
      }

      // 2. Mauvais nombre
      if (num !== currentExpected) {
        await message.react("❌").catch(() => {});
        await message.channel.send(
          `❌ **${message.author}** s'est trompé avec **${num}** ! Le nombre attendu était **${currentExpected}**.\n🔄 Le compteur redémarre à **1**.\n🏆 Record actuel : **${currentRecord}**`
        );
        await GuildConfiguration.updateOne(
          { guildId: message.guild.id },
          {
            $set: {
              "counting.currentNumber": 1,
              "counting.lastUserId": null,
              "counting.channelId": message.channel.id
            }
          },
          { upsert: true }
        );
        return;
      }

      // 3. Nombre correct !
      const isMultipleOf100 = num % 100 === 0;
      await message.react(isMultipleOf100 ? "💯" : "✅").catch(() => {});

      const newRecord = Math.max(currentRecord, num);
      const isNewRecord = num > currentRecord && currentRecord > 0;

      // Récompense utilisateur : +1 émeraude/coin et +10 XP
      await User.updateOne(
        { userId: message.author.id, guildId: message.guild.id },
        { $inc: { balance: 1 } },
        { upsert: true }
      ).catch(() => {});

      await Level.updateOne(
        { userId: message.author.id, guildId: message.guild.id },
        { $inc: { xp: 10 } },
        { upsert: true }
      ).catch(() => {});

      // Annonce de palier important
      if ([50, 100, 250, 500, 1000, 2000, 5000].includes(num)) {
        await message.channel.send(
          `🎉 **Incroyable ! Le palier des ${num} a été franchi !** Bravo à toute la communauté ! Continuons vers les **${num * 2}** ! 🚀`
        ).catch(() => {});
      } else if (isNewRecord && num % 25 === 0) {
        await message.channel.send(
          `⭐ **Nouveau record du serveur atteint : ${num} !**`
        ).catch(() => {});
      }

      // Mise à jour de l'état
      await GuildConfiguration.updateOne(
        { guildId: message.guild.id },
        {
          $set: {
            "counting.currentNumber": num + 1,
            "counting.lastUserId": message.author.id,
            "counting.record": newRecord,
            "counting.channelId": message.channel.id
          }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("Erreur dans countingGame messageCreate:", err);
    }
  }
};
