const GITHUB_REPO = "Scorpion-g/Sparcky";
const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
const CURRENT_VERSION = "2.6.0";

function getGitHubReleaseUrl(version = CURRENT_VERSION) {
  const tag = version.startsWith("v") ? version : `v${version}`;
  return `${GITHUB_REPO_URL}/releases/tag/${tag}`;
}

const CHANGELOGS = [
  {
    version: "2.6.0",
    date: "19 Novembre 2026",
    type: "FEATURE",
    githubUrl: getGitHubReleaseUrl("2.6.0"),
    title: "Sparcky v2.6.0 : Quêtes Journalières, Loterie, Duels, Réputation & Synergie Minecraft",
    summary: "Mise à jour majeure d'engagement et d'interconnexion : Quêtes quotidiennes avec bonus Grand Chelem, Loterie communautaire avec jackpot progressif, Duels PvP entre membres avec mises, Système de réputation bienveillant (/rep), Salons vocaux statistiques en temps réel, Synchronisation automatique Rôles Discord vers Grades Minecraft LuckPerms et Récompenses de Boost & Niveaux in-game via RCON.",
    highlights: [
      {
        emoji: "📜",
        title: "Quêtes Journalières (/quests)",
        desc: "3 défis quotidiens renouvelés à minuit avec barre de progression et bonus +50% Grand Chelem.",
        inline: true
      },
      {
        emoji: "🎰",
        title: "Loterie Communautaire (/loterie)",
        desc: "Achat de tickets pour gonfler le jackpot, tirage au sort hebdomadaire automatique le dimanche à 20h.",
        inline: true
      },
      {
        emoji: "⚔️",
        title: "Duels PvP (/duel)",
        desc: "Défiez un membre sur un jet de dés ou un chifumi avec mise de pièces en jeu et taxe casino régulatrice.",
        inline: true
      },
      {
        emoji: "🌟",
        title: "Système de Réputation (/rep)",
        desc: "Remerciez les membres serviables une fois par jour et hissez-vous au classement /leaderboard rep.",
        inline: true
      },
      {
        emoji: "📊",
        title: "Voice Counters (/setup counters)",
        desc: "Salons vocaux statistiques mis à jour automatiquement (Membres Discord & Joueurs en jeu Minecraft).",
        inline: true
      },
      {
        emoji: "⛏️",
        title: "Synergie Minecraft & LuckPerms",
        desc: "Synchronisation instantanée des rôles vers les grades Minecraft, récompense in-game de Boost et paliers de niveaux.",
        inline: true
      }
    ],
    details: [
      "Nouvelle commande `/quests` (view, claim) et utilitaire `questUtils` intégré à l'activité Discord.",
      "Nouvelle commande `/loterie` (info, buy, draw) et système de tirage hebdomadaire automatisé.",
      "Nouvelle commande `/duel` (adversaire, mise, jeu: dés ou chifumi) avec confirmation interactive par bouton.",
      "Nouvelle commande `/rep` (membre, raison) et intégration dans `/leaderboard rep`.",
      "Nouveaux sous-commandes `/setup counters` et `/setup rolesync`.",
      "Listener `guildMemberUpdate` pour synchronisation LuckPerms et récompense de Nitro Boost.",
      "Exécution automatique de commandes RCON sur les paliers de niveaux configurés."
    ]
  },
  {
    version: "2.5.0",
    date: "19 Novembre 2026",
    type: "FEATURE",
    githubUrl: getGitHubReleaseUrl("2.5.0"),
    title: "Sparcky v2.5.0 : Intégrations Créateurs, Form Builder & Mini-Jeux",
    summary: "Ajout des intégrations automatisées YouTube & Twitch sans clé API (RSS / GQL), constructeur de formulaires et candidatures avec Modaux Discord et révision staff en 1 clic, validation automatique du jeu du compteur (records et XP) et système de Trivia / Question du Jour quotidienne avec récompenses en émeraudes.",
    highlights: [
      {
        emoji: "🔌",
        title: "Intégrations YouTube & Twitch",
        desc: "Alertes automatiques instantanées dès qu'une vidéo sort ou qu'un live démarre, configurables depuis le panel.",
        inline: true
      },
      {
        emoji: "📋",
        title: "Form Builder & Modaux Discord",
        desc: "Créez des formulaires avec modaux Discord personnalisés, boutons Accepter/Refuser staff et attribution automatique de rôles.",
        inline: true
      },
      {
        emoji: "🔢",
        title: "Compteur Automatisé",
        desc: "Validation en temps réel du salon de comptage, gestion des records du serveur et récompenses XP/émeraudes.",
        inline: true
      },
      {
        emoji: "🧠",
        title: "Question du Jour (Trivia)",
        desc: "Questions quotidiennes interactives avec détection automatique de la bonne réponse dans le chat et gains d'émeraudes.",
        inline: true
      }
    ],
    details: [
      "Onglet 'Intégrations' sur le tableau de bord web pour YouTube et Twitch.",
      "Onglet 'Formulaires' avec éditeur visuel, aperçu interactif Discord et modale de consultation des candidatures.",
      "Bot listener pour les modaux Discord (`form_open_`, `form_submit_`, `form_accept_`, `form_refuse_`).",
      "Event messageCreate `countingGame` pour les salons de compteurs de n'importe quel serveur.",
      "Module `qotdTrivia` pour animer la communauté avec des questions de culture gaming / Minecraft."
    ]
  },
  {
    version: "2.4.1",
    date: "18 Novembre 2026",
    type: "FIX",
    githubUrl: getGitHubReleaseUrl("2.4.1"),
    title: "Sparcky v2.4.1 : Précision des Métriques & Données Réelles",
    summary: "Refonte complète du calcul des métriques du serveur : suppression des données simulées au profit du tracking réel en direct (messages et arrivées), résolution des pseudos/avatars Discord pour les classements, correction des collections MongoDB pour les niveaux (Level) et Giveaways, et calcul exact des sanctions.",
    highlights: [
      {
        emoji: "🎯",
        title: "Métriques 100% Réelles",
        desc: "Remplacement des graphiques synthétiques par un système de suivi en temps réel des messages et arrivées.",
        inline: true
      },
      {
        emoji: "👥",
        title: "Pseudos & Avatars",
        desc: "Affichage des avatars et pseudos réels des membres dans les Tops XP et Économie au lieu des simples identifiants bruts.",
        inline: true
      },
      {
        emoji: "🔧",
        title: "Synchronisation Collections",
        desc: "Résolution des requêtes BDD pour les classements de niveaux, giveaways et salons de tickets.",
        inline: true
      }
    ]
  },
  {
    version: "2.4.0",
    date: "18 Novembre 2026",
    type: "FEATURE",
    githubUrl: getGitHubReleaseUrl("2.4.0"),
    title: "Sparcky v2.4.0 : Nouveaux Modules & Personnalisation Complète",
    summary: "Mise à jour majeure du Dashboard et du Bot : ajout de 4 nouveaux modules (Statistiques & Graphiques, Reaction Roles, Journal d'Audit en direct, Auto-Répondeur) et personnalisation avancée des messages de bienvenue, d'au revoir et des paliers d'auto-sanctions.",
    highlights: [
      {
        emoji: "📊",
        title: "Statistiques & Activité",
        desc: "Graphiques interactifs sur 7 jours, compteurs en temps réel et classements d'XP et d'économie.",
        inline: true
      },
      {
        emoji: "🎭",
        title: "Reaction Roles",
        desc: "Créateur de panneaux de rôles interactifs avec boutons de styles personnalisés et envoi direct sur Discord.",
        inline: true
      },
      {
        emoji: "📜",
        title: "Journal d'Audit Web",
        desc: "Suivi en direct des actions de modération, des modifications de serveurs, des warns et des sanctions.",
        inline: true
      },
      {
        emoji: "🤖",
        title: "Auto-Répondeur & Commandes Custom",
        desc: "Déclencheurs automatiques par mots-clés avec support des variables dynamiques et embeds soignés.",
        inline: true
      },
      {
        emoji: "🎉",
        title: "Bienvenue & Au Revoir Personnalisés",
        desc: "Messages sur-mesure, embeds personnalisés, DMs d'accueil et aperçu Discord en temps réel.",
        inline: true
      },
      {
        emoji: "⚖️",
        title: "Paliers d'Auto-Sanctions Dynamiques",
        desc: "Configuration personnalisée des seuils d'avertissements, durées de timeout et sanctions progressives.",
        inline: true
      }
    ]
  },
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
