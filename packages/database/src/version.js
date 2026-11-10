const CURRENT_VERSION = "2.0.0";

const CHANGELOGS = [
  {
    version: "2.0.0",
    date: "10 Novembre 2026",
    type: "MAJOR",
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
  getChangelog
};
