const GITHUB_REPO = "Scorpion-g/Sparcky";
const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
const CURRENT_VERSION = "2.3.4";

function getGitHubReleaseUrl(version = CURRENT_VERSION) {
  const tag = version.startsWith("v") ? version : `v${version}`;
  return `${GITHUB_REPO_URL}/releases/tag/${tag}`;
}

const CHANGELOGS = [
  {
    version: "2.3.4",
    date: "11 Novembre 2026",
    type: "MAJOR",
    githubUrl: getGitHubReleaseUrl("2.3.4"),
    title: "Sparcky v2 : La Grande Évolution (Refonte Majeure depuis la v1)",
    summary: "Après des semaines de développement, Sparcky passe un cap historique ! Fini les commandes dispersées et les réglages fastidieux : découvrez une refonte totale de l'architecture, un nouveau dashboard web avec mode démo, une sécurité renforcée et une ergonomie repensée pour vos communautés.",
    highlights: [
      {
        emoji: "🛡️",
        title: "Sécurité & Sanctions (/security)",
        desc: "Anti-raid, anti-spam, anti-lien, filtre de mots interdits intelligent et sanctions automatiques progressives (warns, timeout, kick, ban).",
        inline: true
      },
      {
        emoji: "⚙️",
        title: "Hubs Unifiés & Menu /help",
        desc: "Centralisation totale avec /setup (bienvenue, autoroles, vocaux) et menu déroulant interactif par catégories sur /help.",
        inline: true
      },
      {
        emoji: "🌐",
        title: "Nouveau Dashboard & Démo Web",
        desc: "Panel web complet (sparcky.matteoriviere.fr) traduit en 3 langues (FR/EN/ES) et mode Sandbox Démo accessible sans connexion.",
        inline: true
      },
      {
        emoji: "📢",
        title: "Constructeur d'Embeds Visuels",
        desc: "Créez des annonces sur mesure avec prévisualisation Discord en direct, jusqu'à 25 champs (fields) et options inline.",
        inline: true
      },
      {
        emoji: "🎵",
        title: "Blind Test & Giveaways",
        desc: "Blind Test Deezer avec tolérance des fautes (Levenshtein), durées personnalisées et système complet de tirages au sort.",
        inline: true
      },
      {
        emoji: "🧹",
        title: "Nettoyage Avancé (/clear)",
        desc: "Purge intelligente et rapide des messages avec filtres par membre, messages de bots ou liens publicitaires.",
        inline: true
      }
    ]
  },
  {
    version: "2.3.2",
    date: "10 Novembre 2026",
    type: "MINOR",
    githubUrl: getGitHubReleaseUrl("2.3.2"),
    title: "Mise à Jour v2.3.2 : Refonte Sécurité, Menu Déroulant /help, Commandes Unifiées & Démo Multilingue",
    summary: "Refonte majeure de l'ergonomie et de la sécurité du bot : nouveau centre d'aide interactif avec menu déroulant par catégories, unification des commandes de configuration (/setup) et de sécurité (/security), purge de messages filtrable (/clear), tolérance intelligente et durées personnalisées sur le Blind Test, et mode Démo interactif multilingue (FR, EN, ES) sur le web.",
    highlights: [
      {
        emoji: "📖",
        title: "Centre d'Aide Interactif /help",
        desc: "Menu déroulant par catégories (Sécurité, Modération, Économie, Setup, Fun, Tickets, Général) avec affichage automatique des sous-commandes."
      },
      {
        emoji: "🛡️",
        title: "Hubs Unifiés /security & /setup",
        desc: "Gestion centralisée de l'auto-modération et de la configuration du serveur (bienvenue, départs, autorole, vocaux temporaires, langue)."
      },
      {
        emoji: "🎵",
        title: "Blind Test Deezer Perfectionné",
        desc: "Validation souple des réponses (tolérance Levenshtein, expressions orales) et choix de la durée de chaque manche (15s à 60s)."
      },
      {
        emoji: "🌐",
        title: "Sandbox Démo & Panel Multilingue",
        desc: "Espace interactif public sur sparcky.matteoriviere.fr/demo et traduction intégrale du panel en Français, Anglais et Espagnol."
      }
    ]
  },
  {
    version: "2.3.0",
    date: "10 Novembre 2026",
    type: "MINOR",
    githubUrl: getGitHubReleaseUrl("2.3.0"),
    title: "Mise à Jour v2.3.0 : Refonte Ergonomie, Sécurité, Commandes Unifiées & Mode Démo Web",
    summary: "Refonte majeure de l'ergonomie utilisateur et de la sécurité : unification de l'auto-modération sous /security, centralisation des réglages serveur sous /setup, nouvelle commande /clear filtrable, charte visuelle des embeds unifiée (Sparcky Theme), réorganisation modulaire du code et ajout du mode Démo interactif public sur le dashboard web.",
    highlights: [
      {
        emoji: "🛡️",
        title: "Centre de Sécurité /security",
        desc: "Tableau de bord visuel et gestion centralisée des protections (anti-lien, anti-spam, anti-raid, badwords, sanctions, logs)."
      },
      {
        emoji: "⚙️",
        title: "Configuration Simple /setup & /clear",
        desc: "Configuration instantanée des salons de bienvenue, départ, auto-rôles, hub vocal et nettoyage de chat filtrable par utilisateur."
      },
      {
        emoji: "🎮",
        title: "Sandbox Démo sur le Web",
        desc: "Nouvel espace interactif public sur sparcky.matteoriviere.fr/demo pour tester toutes les fonctionnalités sans compte requis."
      }
    ]
  },
  {
    version: "2.2.3",
    date: "10 Novembre 2026",
    type: "PATCH",
    githubUrl: getGitHubReleaseUrl("2.2.3"),
    title: "Correctif v2.2.3 : Tolérance Intelligente des Réponses & Choix du Temps de Jeu",
    summary: "Validation ultra-souple des réponses en cours de Blind Test (mots clés distinctifs, tolérance aux fautes de frappe et pluriels, préfixes oraux 'c'est...'), et ajout de l'option de durée personnalisée par manche (15s, 20s, 30s, 45s, 60s) dans /blindtest start.",
    highlights: [
      {
        emoji: "🎯",
        title: "Validation Souple & Fuzzy Matching",
        desc: "Tolérance élevée aux fautes d'orthographe (Levenshtein), aux mots clés uniques (ex: 'Bruno' ou 'Jackson') et aux expressions orales ('c'est...')."
      },
      {
        emoji: "⏱️",
        title: "Temps de Réponse Personnalisable",
        desc: "Choisissez la durée de chaque manche avec l'option duration : Express (15s), Rapide (20s), Standard (30s), Détente (45s) ou Tranquille (60s)."
      }
    ]
  },
  {
    version: "2.2.2",
    date: "10 Novembre 2026",
    type: "PATCH",
    githubUrl: getGitHubReleaseUrl("2.2.2"),
    title: "Correctif v2.2.2 : Chansons Disney Cultes & Playlists Officielles Vérifiées",
    summary: "Remplacement des recherches textuelles Deezer par des playlists officielles et vérifiées (Disney Hits France, Film Classics, En mode 80/90...). Élimination totale des chapitres de livres audio, contes et podcasts, et support de la détection du film/dessin animé en direct dans le chat.",
    highlights: [
      {
        emoji: "🏰",
        title: "100% Chansons Disney & Zéro Podcast",
        desc: "Filtrage automatique des chapitres de livres audio et utilisation des playlists Disney officielles."
      },
      {
        emoji: "🎬",
        title: "Détection du Film / Univers",
        desc: "Les joueurs peuvent désormais trouver le film (ex: Aladdin, Le Roi Lion, Vaiana) pour marquer des points !"
      }
    ]
  },
  {
    version: "2.2.1",
    date: "10 Novembre 2026",
    type: "PATCH",
    githubUrl: getGitHubReleaseUrl("2.2.1"),
    title: "Correctif v2.2.1 : Streaming Audio Deezer en Vocal",
    summary: "Correction du flux audio dans les salons vocaux Discord lors des parties de Blind Test : en-têtes User-Agent sécurisés et streaming direct vers le lecteur Opus pour assurer une écoute fluide et sans coupure.",
    highlights: [
      {
        emoji: "🔊",
        title: "Résolution du son vocal",
        desc: "Contournement de la restriction HTTP 403 sur le CDN audio et transmission directe des flux Opus."
      }
    ]
  },
  {
    version: "2.2.0",
    date: "10 Novembre 2026",
    type: "MINOR",
    githubUrl: getGitHubReleaseUrl("2.2.0"),
    title: "Mise à Jour v2.2.0 : Jeu de Blind Test Vocal & Audio HD",
    summary: "Introduction du mini-jeu multijoueur de Blind Test dans les salons vocaux avec /blindtest ! Profitez de 6 thèmes musicaux (Hits, Années 80/90, Rap, Disney, Bandes Originales de Films, Anime & Gaming), de réponses détectées en direct dans le chat, d'un classement en temps réel et de récompenses pour les vainqueurs.",
    highlights: [
      {
        emoji: "🎮",
        title: "Blind Test Vocal Multijoueur",
        desc: "Lancez des parties de 5 à 20 manches avec /blindtest start dans n'importe quel salon vocal avec streaming audio haute fidélité."
      },
      {
        emoji: "🎶",
        title: "6 Thèmes Musicaux Riches",
        desc: "Hits du moment, Années 80 & 90, Rap Français & US, Univers Disney, Cinéma & Séries, Anime & Gaming."
      },
      {
        emoji: "🎯",
        title: "Détection Intelligente & Récompenses",
        desc: "Validation tolérante des titres et artistes saisis dans le chat, affichage des pochettes d'albums et gains en monnaie virtuelle pour le podium."
      }
    ]
  },
  {
    version: "2.1.0",
    date: "10 Novembre 2026",
    type: "MINOR",
    githubUrl: getGitHubReleaseUrl("2.1.0"),
    title: "Mise à Jour v2.1.0 : Système Complet de Giveaways & Panel 100% Traduit",
    summary: "Découvrez notre nouveau gestionnaire de giveaways interactif avec boutons Discord, compte à rebours automatique en temps réel, tirages équitables et reroll depuis le panel web et Discord, ainsi que la traduction complète du tableau de bord.",
    highlights: [
      {
        emoji: "🎉",
        title: "Système Complet de Giveaways",
        desc: "Créez et gérez des concours sur Discord (/giveaway) et sur le web avec boutons de participation interactifs et tirage automatique des gagnants."
      },
      {
        emoji: "🌍",
        title: "Traduction Intégrale du Panel",
        desc: "Tous les onglets, salons, sécurité, rôles et paramètres sont désormais entièrement disponibles en Français 🇫🇷, Anglais 🇬🇧 et Espagnol 🇪🇸."
      },
      {
        emoji: "⚡",
        title: "Synchronisation Atomique & Fiabilité",
        desc: "Sauvegarde sécurisée des participations dans MongoDB et surveillance continue des expirations toutes les 15 secondes."
      }
    ]
  },
  {
    version: "2.0.0",
    date: "10 Novembre 2026",
    type: "MAJOR",
    githubUrl: getGitHubReleaseUrl("2.0.0"),
    title: "Mise à Jour v2.0.0 : Nouveau Panel Web, Économie Complète & Niveaux",
    summary: "Lancement officiel de la version 2.0.0 de God_Sparky ! Découvrez notre nouveau tableau de bord en ligne, un système économique avec boutique interactive, un module d'XP avec rôles de paliers, des tickets dynamiques et un support multi-langues.",
    highlights: [
      {
        emoji: "🌐",
        title: "Tableau de Bord Web Officiel",
        desc: "Gérez vos serveurs en temps réel sur https://sparcky.matteoriviere.fr (OAuth2 Discord sécurisé)."
      },
      {
        emoji: "🪙",
        title: "Économie & Boutique Interactives",
        desc: "Commandes /money, /daily, /work, /coinflip, /pay et /shop avec attribution automatique de rôles Discord."
      },
      {
        emoji: "🏆",
        title: "Niveaux & Rôles de Récompenses",
        desc: "Gagnez de l'XP par message (/level) et configurez l'attribution automatique de rôles à chaque palier atteint."
      },
      {
        emoji: "🎫",
        title: "Tickets & Support Rapide",
        desc: "Panneau avec menu déroulant personnalisé et gestion des salons ouverts en direct depuis le web."
      },
      {
        emoji: "📢",
        title: "Constructeur d'Embeds",
        desc: "Éditeur WYSIWYG pour envoyer des annonces soignées sur n'importe quel salon du serveur."
      },
      {
        emoji: "🌍",
        title: "Internationalisation (i18n)",
        desc: "Le bot et le panel parlent désormais Français 🇫🇷, Anglais 🇬🇧 et Espagnol 🇪🇸."
      }
    ]
  }
];

function getLatestChangelog() {
  return CHANGELOGS[0];
}

function getChangelog(version) {
  if (!version) return getLatestChangelog();
  return CHANGELOGS.find((c) => c.version === version) || getLatestChangelog();
}

module.exports = {
  CURRENT_VERSION,
  CHANGELOGS,
  getLatestChangelog,
  getChangelog,
  GITHUB_REPO,
  GITHUB_REPO_URL,
  getGitHubReleaseUrl,
};
