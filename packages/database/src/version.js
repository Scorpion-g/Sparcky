const GITHUB_REPO = "Scorpion-g/Sparcky";
const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
const CURRENT_VERSION = "2.1.0";

function getGitHubReleaseUrl(version = CURRENT_VERSION) {
  const tag = version.startsWith("v") ? version : `v${version}`;
  return `${GITHUB_REPO_URL}/releases/tag/${tag}`;
}

const CHANGELOGS = [
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
