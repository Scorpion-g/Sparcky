import React, { createContext, useContext, useState, useEffect } from "react"

const translations = {
  fr: {
    // Nav & Commun
    "app.title": "God_Sparky",
    "app.subtitle": "Panneau d'administration",
    "common.logout": "Déconnexion",
    "common.save": "Sauvegarder",
    "common.saving": "Enregistrement...",
    "common.saved": "Modifications enregistrées !",
    "common.error": "Une erreur est survenue",
    "common.backToServers": "Retour aux serveurs",
    "common.botAbsent": "Bot absent",
    "common.inviteBot": "Inviter le bot",
    "common.refresh": "Actualiser",
    "common.active": "Actif",
    "common.disabled": "Désactivé",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.add": "Ajouter",
    "common.close": "Fermer",
    "common.loading": "Chargement...",

    // Dashboard
    "dash.title": "Vos Serveurs Discord",
    "dash.subtitle": "Sélectionnez un serveur pour gérer God_Sparky et ses fonctionnalités.",
    "dash.searchPlaceholder": "Rechercher par nom ou identifiant de serveur...",
    "dash.tabAdmin": "Mes Serveurs Administrés",
    "dash.tabWithBot": "Avec le Bot",
    "dash.tabToInvite": "À Inviter",
    "dash.tabAll": "Tous",
    "dash.btnConfigure": "Configurer le bot →",
    "dash.btnInvite": "+ Inviter God_Sparky",
    "dash.roleOwner": "Propriétaire",
    "dash.roleAdmin": "Admin",
    "dash.roleMember": "Membre",
    "dash.statusPresent": "Présent",
    "dash.statusNotInvited": "Non invité",
    "dash.noServer": "Aucun serveur trouvé pour cette recherche ou catégorie.",

    // Guild Tabs
    "tabs.channels": "Salons & Rôles",
    "tabs.security": "Sécurité",
    "tabs.economy": "Économie & Shop",
    "tabs.leveling": "Niveaux & XP",
    "tabs.giveaways": "Giveaways",
    "tabs.tickets": "Tickets",
    "tabs.embeds": "Embed Builder",
    "tabs.warns": "Sanctions Web",
    "tabs.words": "Mots Interdits",
    "tabs.settings": "Général",

    // Salons & Rôles
    "channels.title": "Salons Textuels et Vocaux",
    "channels.desc": "Définissez les salons pour les messages d'arrivée, de départ, de logs et de salon vocal temporaire.",
    "channels.welcome": "Salon de Bienvenue",
    "channels.welcomeDesc": "Où accueillir les nouveaux membres arrivants.",
    "channels.leave": "Salon de Départ",
    "channels.leaveDesc": "Où annoncer les membres qui quittent le serveur.",
    "channels.modLog": "Salon des Logs de Modération",
    "channels.modLogDesc": "Où sont consignés les sanctions, avertissements et actions de modération.",
    "channels.autoRole": "Rôle Automatique (Auto-Role)",
    "channels.autoRoleDesc": "Attribué immédiatement aux nouveaux membres dès leur arrivée.",
    "channels.vocHub": "Salon Vocal Hub (Temporaires)",
    "channels.vocHubDesc": "Rejoindre ce salon vocal crée automatiquement un salon privé temporaire pour l'utilisateur.",
    "channels.announcements": "Salon d'Annonces & Mises à Jour du Bot",
    "channels.announcementsDesc": "Où recevoir automatiquement les annonces de nouveautés et mises à jour majeures de God_Sparky.",
    "channels.autoDetect": "Détection automatique intelligente (recommandé)",
    "channels.autoRoleSection": "Attribution Automatique des Rôles",
    "channels.autoRoleSectionDesc": "Attribuez automatiquement un rôle dès l'entrée sur le serveur Discord.",
    "channels.noRole": "Aucun (pas de rôle automatique)",

    // Sécurité
    "sec.title": "Protection & Auto-Modération",
    "sec.desc": "Activez les modules de protection automatique contre le spam, les raids et les liens indésirables.",
    "sec.antispam": "Anti-Spam intelligent",
    "sec.antispamDesc": "Détecte et supprime les messages répétés trop rapidement (plus de 5 messages en 10 secondes).",
    "sec.antilink": "Anti-Liens non autorisés",
    "sec.antilinkDesc": "Supprime les invitations Discord et URLs suspectes postées par des non-administrateurs.",
    "sec.antiraid": "Protection Anti-Raid",
    "sec.antiraidDesc": "Expulse automatiquement les nouveaux arrivants suspects lors des vagues de raid.",
    "sec.antiraidMode": "Mode Anti-Raid Renforcé",
    "sec.antiraidModeDesc": "Expulse immédiatement les nouveaux membres suspectés de faire partie d'un raid massif.",
    "sec.antibadwords": "Filtre de Mots Interdits",
    "sec.antibadwordsDesc": "Censure et avertit les membres employant des termes de votre liste noire.",
    "sec.autosanction": "Auto-Sanction progressive",
    "sec.autosanctionDesc": "Applique automatiquement un timeout (mute) puis un kick ou ban selon le cumul des avertissements.",

    // Économie
    "eco.title": "Système d'Économie & Récompenses",
    "eco.desc": "Configurez la monnaie virtuelle, les gains et la boutique de votre communauté.",
    "eco.toggle": "Activer le système d'économie sur ce serveur",
    "eco.toggleDesc": "Permet aux membres d'utiliser les commandes d'argent (/money, /daily, /work, /coinflip, /pay), la boutique (/shop) et les gains par message.",
    "eco.warningDisabled": "Économie désactivée : les membres ne peuvent pas gagner d'argent, transférer de fonds ou faire des achats sur Discord.",
    "eco.currencySymbol": "Symbole de la monnaie",
    "eco.currencyName": "Nom de la monnaie",
    "eco.dailyAmount": "Récompense journalière (/daily)",
    "eco.workMin": "Salaire minimum (/work)",
    "eco.workMax": "Salaire maximum (/work)",
    "eco.chatReward": "Gain passif par message (Chat-to-Earn)",
    "eco.allowRob": "Autoriser les vols d'argent (/rob)",
    "eco.allowRobDesc": "Permet aux membres de tenter de dérober de l'argent virtuel à d'autres membres.",
    "eco.shopTitle": "Boutique du Serveur (/shop)",
    "eco.shopDesc": "Créez des articles et des rôles Discord achetables avec la monnaie virtuelle.",
    "eco.leaderboardTitle": "Classement des Membres les Plus Riches",
    "eco.itemAdd": "Ajouter un article",
    "eco.itemName": "Nom de l'article",
    "eco.itemPrice": "Prix",
    "eco.itemRole": "Rôle Discord associé",
    "eco.itemStock": "Stock (-1 pour infini)",

    // Niveaux
    "lvl.title": "Système d'Expérience & Niveaux",
    "lvl.desc": "Récompensez l'activité des membres sur votre serveur Discord.",
    "lvl.toggle": "Activer le système de niveaux et d'XP",
    "lvl.toggleDesc": "Les membres reçoivent de l'expérience aléatoire (15 à 30 XP) à chaque message envoyé avec un délai d'une minute.",
    "lvl.channel": "Salon d'annonce des passages de niveau",
    "lvl.channelDesc": "Où célébrer les montées en niveau des membres lorsqu'ils gagnent de l'XP.",
    "lvl.rewardsTitle": "Rôles de Paliers (Level Rewards)",
    "lvl.rewardsDesc": "Attribuez automatiquement des rôles Discord lorsqu'un membre atteint un niveau spécifique.",
    "lvl.leaderboardTitle": "Classement des Niveaux",

    // Giveaways
    "gw.title": "Gestion des Giveaways & Tirages au Sort",
    "gw.desc": "Créez et gérez des concours avec tirage au sort automatique et bouton interactif sur votre serveur Discord.",
    "gw.createTitle": "Lancer un nouveau Giveaway",
    "gw.prize": "Lot à gagner",
    "gw.prizePlaceholder": "Ex: Discord Nitro 1 Mois, 50k Coins, Rôle VIP...",
    "gw.channel": "Salon Discord d'annonce",
    "gw.channelPlaceholder": "Sélectionner un salon textuel",
    "gw.duration": "Durée (en minutes)",
    "gw.winnersCount": "Nombre de gagnant(s)",
    "gw.btnStart": "Lancer le Giveaway sur Discord 🎉",
    "gw.starting": "Création en cours...",
    "gw.listTitle": "Giveaways du Serveur",
    "gw.noGiveaways": "Aucun giveaway trouvé sur ce serveur.",
    "gw.statusActive": "En cours",
    "gw.statusEnded": "Terminé",
    "gw.participants": "participant(s)",
    "gw.winners": "Gagnant(s) :",
    "gw.noWinners": "Aucun gagnant",
    "gw.btnEnd": "Terminer & Tirer 🛑",
    "gw.btnReroll": "Relancer le tirage (Reroll) 🔄",
    "gw.btnDelete": "Supprimer 🗑️",
    "gw.confirmEnd": "Voulez-vous vraiment terminer ce giveaway et désigner les gagnants dès maintenant ?",
    "gw.confirmReroll": "Relancer un nouveau tirage au sort parmi les participants ?",
    "gw.confirmDelete": "Supprimer définitivement ce giveaway de l'historique ?",
    "gw.successCreated": "🎉 Giveaway lancé avec succès sur Discord !",
    "gw.successEnded": "Giveaway terminé et gagnant(s) tiré(s) au sort !",
    "gw.successReroll": "Nouveau tirage au sort effectué avec succès !",

    // Tickets
    "tkt.title": "Gestion du Système de Tickets",
    "tkt.desc": "Gérez la configuration du support, les salons ouverts et déployez l'embed interactif.",
    "tkt.toggle": "Activer le système de tickets",
    "tkt.toggleDesc": "Active la gestion des tickets privés de support sur ce serveur.",
    "tkt.category": "Catégorie des Tickets Discord",
    "tkt.categoryDesc": "Catégorie sous laquelle les salons textuels de ticket seront créés.",
    "tkt.supportRole": "Rôle Support / Modération",
    "tkt.supportRoleDesc": "Rôle ayant accès à tous les tickets créés pour répondre aux membres.",
    "tkt.logChannel": "Salon des Logs de Tickets",
    "tkt.logChannelDesc": "Salon où consigner les transcriptions et fermetures de tickets.",
    "tkt.types": "Types de Tickets (séparés par des virgules)",
    "tkt.deployTitle": "Déployer le panneau sur Discord",
    "tkt.deployDesc": "Envoie un embed officiel avec un menu déroulant permettant aux membres d'ouvrir un ticket.",
    "tkt.deployBtn": "Envoyer le panneau sur Discord",
    "tkt.openTicketsTitle": "Tickets Ouverts en Temps Réel",

    // Embeds
    "emb.title": "Constructeur d'Embeds (Embed Builder)",
    "emb.desc": "Créez des annonces et messages riches avec prévisualisation en direct et envoi immédiat sur Discord.",
    "emb.sendBtn": "Envoyer l'embed sur Discord 🚀",

    // Modération & Sanctions
    "warns.title": "Historique des Avertissements & Sanctions",
    "warns.desc": "Consultez la liste des membres avertis et révoquez leurs sanctions directement depuis le web.",

    // Mots interdits
    "words.title": "Liste Noire de Mots Interdits",
    "words.desc": "Les messages contenant ces mots seront supprimés si le filtre Anti-Mots Interdits est activé.",

    // Général & Langue
    "gen.title": "Langue & Paramètres Généraux",
    "gen.desc": "Définissez la langue dans laquelle God_Sparky répond aux commandes et s'affiche sur le panel.",
    "gen.langTitle": "Langue du bot & du tableau de bord",
    "gen.langDesc": "Sélectionnez votre langue de préférence pour l'interface et les messages Discord."
  },

  en: {
    // Nav & Common
    "app.title": "God_Sparky",
    "app.subtitle": "Admin Dashboard",
    "common.logout": "Log out",
    "common.save": "Save changes",
    "common.saving": "Saving...",
    "common.saved": "Changes saved successfully!",
    "common.error": "An error occurred",
    "common.backToServers": "Back to servers",
    "common.botAbsent": "Bot missing",
    "common.inviteBot": "Invite bot",
    "common.refresh": "Refresh",
    "common.active": "Active",
    "common.disabled": "Disabled",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.close": "Close",
    "common.loading": "Loading...",

    // Dashboard
    "dash.title": "Your Discord Servers",
    "dash.subtitle": "Select a server to manage God_Sparky and its features.",
    "dash.searchPlaceholder": "Search by server name or ID...",
    "dash.tabAdmin": "Administered Servers",
    "dash.tabWithBot": "With Bot",
    "dash.tabToInvite": "To Invite",
    "dash.tabAll": "All",
    "dash.btnConfigure": "Configure bot →",
    "dash.btnInvite": "+ Invite God_Sparky",
    "dash.roleOwner": "Owner",
    "dash.roleAdmin": "Admin",
    "dash.roleMember": "Member",
    "dash.statusPresent": "Present",
    "dash.statusNotInvited": "Not invited",
    "dash.noServer": "No servers found matching your query or filter.",

    // Guild Tabs
    "tabs.channels": "Channels & Roles",
    "tabs.security": "Security",
    "tabs.economy": "Economy & Shop",
    "tabs.leveling": "Levels & XP",
    "tabs.giveaways": "Giveaways",
    "tabs.tickets": "Tickets",
    "tabs.embeds": "Embed Builder",
    "tabs.warns": "Web Moderation",
    "tabs.words": "Banned Words",
    "tabs.settings": "General",

    // Channels & Roles
    "channels.title": "Text & Voice Channels",
    "channels.desc": "Set channels for welcome messages, departures, logs, and temporary voice hubs.",
    "channels.welcome": "Welcome Channel",
    "channels.welcomeDesc": "Where new arriving members are greeted.",
    "channels.leave": "Leave Channel",
    "channels.leaveDesc": "Where members leaving the server are announced.",
    "channels.modLog": "Moderation Log Channel",
    "channels.modLogDesc": "Where sanctions, warnings, and mod actions are logged.",
    "channels.autoRole": "Automatic Role (Auto-Role)",
    "channels.autoRoleDesc": "Instantly assigned to new members when they join.",
    "channels.vocHub": "Voice Hub Creator Channel",
    "channels.vocHubDesc": "Joining this voice channel automatically creates a temporary private voice room for the member.",
    "channels.announcements": "Bot Announcements & Updates Channel",
    "channels.announcementsDesc": "Where to automatically receive new features and major release announcements from God_Sparky.",
    "channels.autoDetect": "Smart auto-detection (recommended)",
    "channels.autoRoleSection": "Automatic Role Assignment",
    "channels.autoRoleSectionDesc": "Automatically assign a role as soon as a member joins the Discord server.",
    "channels.noRole": "None (no automatic role)",

    // Security
    "sec.title": "Protection & Auto-Moderation",
    "sec.desc": "Enable automated protection modules against spam, raids, and unauthorized links.",
    "sec.antispam": "Smart Anti-Spam",
    "sec.antispamDesc": "Detects and deletes messages sent too quickly (over 5 messages in 10 seconds).",
    "sec.antilink": "Anti-Unauthorized Links",
    "sec.antilinkDesc": "Deletes Discord invites and suspicious URLs sent by non-administrators.",
    "sec.antiraid": "Anti-Raid Protection",
    "sec.antiraidDesc": "Automatically kicks suspicious new accounts during join waves.",
    "sec.antiraidMode": "Enhanced Anti-Raid Mode",
    "sec.antiraidModeDesc": "Immediately kicks new accounts suspected of participating in a mass raid.",
    "sec.antibadwords": "Banned Words Filter",
    "sec.antibadwordsDesc": "Censors and warns members using blacklisted terms.",
    "sec.autosanction": "Progressive Auto-Sanction",
    "sec.autosanctionDesc": "Automatically applies timeout (mute), then kick or ban based on accumulated warnings.",

    // Economy
    "eco.title": "Economy & Rewards System",
    "eco.desc": "Configure virtual currency, earnings, and server shop.",
    "eco.toggle": "Enable economy system on this server",
    "eco.toggleDesc": "Allows members to use money commands (/money, /daily, /work, /coinflip, /pay), the shop (/shop), and chat rewards.",
    "eco.warningDisabled": "Economy disabled: members cannot earn money, transfer funds, or purchase items on Discord.",
    "eco.currencySymbol": "Currency symbol",
    "eco.currencyName": "Currency name",
    "eco.dailyAmount": "Daily reward (/daily)",
    "eco.workMin": "Minimum salary (/work)",
    "eco.workMax": "Maximum salary (/work)",
    "eco.chatReward": "Passive chat reward per message (Chat-to-Earn)",
    "eco.allowRob": "Allow currency robberies (/rob)",
    "eco.allowRobDesc": "Allows members to attempt stealing virtual currency from other members.",
    "eco.shopTitle": "Server Shop (/shop)",
    "eco.shopDesc": "Create items and Discord roles buyable with virtual currency.",
    "eco.leaderboardTitle": "Richest Members Leaderboard",
    "eco.itemAdd": "Add shop item",
    "eco.itemName": "Item name",
    "eco.itemPrice": "Price",
    "eco.itemRole": "Associated Discord role",
    "eco.itemStock": "Stock (-1 for infinite)",

    // Leveling
    "lvl.title": "Experience & Levels System",
    "lvl.desc": "Reward activity and engagement on your Discord server.",
    "lvl.toggle": "Enable XP & Leveling system",
    "lvl.toggleDesc": "Members receive random XP (15 to 30 XP) on each message sent (1 minute cooldown).",
    "lvl.channel": "Level-up Announcement Channel",
    "lvl.channelDesc": "Where to celebrate member level-ups when they earn XP.",
    "lvl.rewardsTitle": "Tier Roles (Level Rewards)",
    "lvl.rewardsDesc": "Automatically grant Discord roles when members reach specific levels.",
    "lvl.leaderboardTitle": "Levels Leaderboard",

    // Giveaways
    "gw.title": "Giveaways & Contests Management",
    "gw.desc": "Create and manage automated giveaways with interactive buttons on your Discord server.",
    "gw.createTitle": "Launch a new Giveaway",
    "gw.prize": "Prize",
    "gw.prizePlaceholder": "E.g. Discord Nitro 1 Month, 50k Coins, VIP Role...",
    "gw.channel": "Discord Announcement Channel",
    "gw.channelPlaceholder": "Select a text channel",
    "gw.duration": "Duration (in minutes)",
    "gw.winnersCount": "Number of winner(s)",
    "gw.btnStart": "Launch Giveaway on Discord 🎉",
    "gw.starting": "Creating...",
    "gw.listTitle": "Server Giveaways",
    "gw.noGiveaways": "No giveaways found on this server.",
    "gw.statusActive": "Active",
    "gw.statusEnded": "Ended",
    "gw.participants": "participant(s)",
    "gw.winners": "Winner(s):",
    "gw.noWinners": "No winners",
    "gw.btnEnd": "End & Pick 🛑",
    "gw.btnReroll": "Reroll winners 🔄",
    "gw.btnDelete": "Delete 🗑️",
    "gw.confirmEnd": "Do you really want to end this giveaway and pick winners now?",
    "gw.confirmReroll": "Reroll new winners among participants?",
    "gw.confirmDelete": "Permanently delete this giveaway from history?",
    "gw.successCreated": "🎉 Giveaway successfully launched on Discord!",
    "gw.successEnded": "Giveaway ended and winner(s) picked successfully!",
    "gw.successReroll": "Reroll completed successfully!",

    // Tickets
    "tkt.title": "Ticket System Management",
    "tkt.desc": "Manage support configuration, view open channels, and deploy the interactive embed.",
    "tkt.toggle": "Enable ticket system",
    "tkt.toggleDesc": "Enables private support ticket management on this server.",
    "tkt.category": "Discord Ticket Category",
    "tkt.categoryDesc": "Category under which ticket text channels will be created.",
    "tkt.supportRole": "Support / Moderation Role",
    "tkt.supportRoleDesc": "Role with access to all created tickets to assist members.",
    "tkt.logChannel": "Ticket Log Channel",
    "tkt.logChannelDesc": "Channel where transcripts and ticket closings are logged.",
    "tkt.types": "Ticket Types (comma-separated)",
    "tkt.deployTitle": "Deploy Ticket Panel on Discord",
    "tkt.deployDesc": "Sends an interactive embed with a dropdown menu allowing members to open a ticket.",
    "tkt.deployBtn": "Send Panel to Discord",
    "tkt.openTicketsTitle": "Live Open Tickets",

    // Embeds
    "emb.title": "Embed Builder",
    "emb.desc": "Design rich announcements and embeds with live preview and instant Discord sending.",
    "emb.sendBtn": "Send Embed to Discord 🚀",

    // Moderation
    "warns.title": "Warnings & Sanctions History",
    "warns.desc": "Browse warned members and revoke sanctions directly from the web.",

    // Words
    "words.title": "Banned Words Blacklist",
    "words.desc": "Messages containing these terms will be removed if the Anti-Bad Words filter is enabled.",

    // Settings
    "gen.title": "Language & General Settings",
    "gen.desc": "Set the language God_Sparky speaks in Discord and displays on this panel.",
    "gen.langTitle": "Bot & Dashboard Language",
    "gen.langDesc": "Select your preferred language for the web panel and Discord notifications."
  },

  es: {
    // Nav & Común
    "app.title": "God_Sparky",
    "app.subtitle": "Panel de Administración",
    "common.logout": "Cerrar sesión",
    "common.save": "Guardar cambios",
    "common.saving": "Guardando...",
    "common.saved": "¡Cambios guardados con éxito!",
    "common.error": "Ocurrió un error",
    "common.backToServers": "Volver a servidores",
    "common.botAbsent": "Bot ausente",
    "common.inviteBot": "Invitar al bot",
    "common.refresh": "Actualizar",
    "common.active": "Activo",
    "common.disabled": "Desactivado",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.add": "Añadir",
    "common.close": "Cerrar",
    "common.loading": "Cargando...",

    // Dashboard
    "dash.title": "Tus Servidores Discord",
    "dash.subtitle": "Selecciona un servidor para administrar God_Sparky y sus funciones.",
    "dash.searchPlaceholder": "Buscar por nombre o ID de servidor...",
    "dash.tabAdmin": "Servidores Administrados",
    "dash.tabWithBot": "Con el Bot",
    "dash.tabToInvite": "Por Invitar",
    "dash.tabAll": "Todos",
    "dash.btnConfigure": "Configurar el bot →",
    "dash.btnInvite": "+ Invitar a God_Sparky",
    "dash.roleOwner": "Propietario",
    "dash.roleAdmin": "Admin",
    "dash.roleMember": "Miembro",
    "dash.statusPresent": "Presente",
    "dash.statusNotInvited": "No invitado",
    "dash.noServer": "No se encontraron servidores para esta búsqueda o filtro.",

    // Guild Tabs
    "tabs.channels": "Canales y Roles",
    "tabs.security": "Seguridad",
    "tabs.economy": "Economía y Tienda",
    "tabs.leveling": "Niveles y XP",
    "tabs.giveaways": "Sorteos",
    "tabs.tickets": "Tickets",
    "tabs.embeds": "Creador de Embeds",
    "tabs.warns": "Sanciones Web",
    "tabs.words": "Palabras Prohibidas",
    "tabs.settings": "General",

    // Canales
    "channels.title": "Canales de Texto y Voz",
    "channels.desc": "Define canales para mensajes de bienvenida, despedida, registros y salas de voz temporales.",
    "channels.welcome": "Canal de Bienvenida",
    "channels.welcomeDesc": "Donde se da la bienvenida a nuevos miembros.",
    "channels.leave": "Canal de Despedida",
    "channels.leaveDesc": "Donde se anuncia la salida de miembros.",
    "channels.modLog": "Canal de Registros de Moderación",
    "channels.modLogDesc": "Donde se registran sanciones, avisos y acciones del staff.",
    "channels.autoRole": "Rol Automático (Auto-Role)",
    "channels.autoRoleDesc": "Asignado automáticamente a los nuevos miembros al unirse.",
    "channels.vocHub": "Canal Creador de Voz (Hub)",
    "channels.vocHubDesc": "Unirse a este canal crea automáticamente una sala de voz privada temporal.",
    "channels.announcements": "Canal de Anuncios y Actualizaciones del Bot",
    "channels.announcementsDesc": "Donde recibir automáticamente anuncios de novedades y actualizaciones de God_Sparky.",
    "channels.autoDetect": "Detección automática inteligente (recomendado)",
    "channels.autoRoleSection": "Asignación Automática de Roles",
    "channels.autoRoleSectionDesc": "Asigna automáticamente un rol en cuanto un miembro se une al servidor.",
    "channels.noRole": "Ninguno (sin rol automático)",

    // Seguridad
    "sec.title": "Protección y Auto-Moderación",
    "sec.desc": "Activa módulos de protección automática contra spam, raids y enlaces no autorizados.",
    "sec.antispam": "Anti-Spam Inteligente",
    "sec.antispamDesc": "Elimina mensajes repetidos demasiado rápido (más de 5 mensajes en 10 segundos).",
    "sec.antilink": "Anti-Enlaces no autorizados",
    "sec.antilinkDesc": "Elimina invitaciones de Discord y URLs sospechosas.",
    "sec.antiraid": "Protección Anti-Raid",
    "sec.antiraidDesc": "Expulsa automáticamente cuentas sospechosas durante olas de raid.",
    "sec.antiraidMode": "Modo Anti-Raid Reforzado",
    "sec.antiraidModeDesc": "Expulsa inmediatamente cuentas sospechosas de participar en un ataque coordinado.",
    "sec.antibadwords": "Filtro de Palabras Prohibidas",
    "sec.antibadwordsDesc": "Censura y advierte a miembros que usen términos prohibidos.",
    "sec.autosanction": "Auto-Sanción Progresiva",
    "sec.autosanctionDesc": "Aplica silenciado (timeout), expulsión o baneo según las advertencias acumuladas.",

    // Economía
    "eco.title": "Sistema de Economía y Recompensas",
    "eco.desc": "Configura la moneda virtual, ganancias y la tienda del servidor.",
    "eco.toggle": "Activar el sistema de economía en este servidor",
    "eco.toggleDesc": "Permite a los miembros usar comandos de dinero (/money, /daily, /work, /coinflip, /pay), la tienda (/shop) y recompensas de chat.",
    "eco.warningDisabled": "Economía desactivada: los miembros no pueden ganar dinero ni comprar en Discord.",
    "eco.currencySymbol": "Símbolo de la moneda",
    "eco.currencyName": "Nombre de la moneda",
    "eco.dailyAmount": "Recompensa diaria (/daily)",
    "eco.workMin": "Salario mínimo (/work)",
    "eco.workMax": "Salario máximo (/work)",
    "eco.chatReward": "Ganancia pasiva por mensaje (Chat-to-Earn)",
    "eco.allowRob": "Permitir robos de dinero (/rob)",
    "eco.allowRobDesc": "Permite a los miembros intentar robar dinero virtual a otros miembros.",
    "eco.shopTitle": "Tienda del Servidor (/shop)",
    "eco.shopDesc": "Crea artículos y roles de Discord comprables con moneda virtual.",
    "eco.leaderboardTitle": "Tabla de Clasificación de Miembros más Ricos",
    "eco.itemAdd": "Añadir artículo",
    "eco.itemName": "Nombre del artículo",
    "eco.itemPrice": "Precio",
    "eco.itemRole": "Rol de Discord asociado",
    "eco.itemStock": "Stock (-1 para infinito)",

    // Niveles
    "lvl.title": "Sistema de Experiencia y Niveles",
    "lvl.desc": "Recompensa la actividad y participación de los miembros en Discord.",
    "lvl.toggle": "Activar sistema de niveles y XP",
    "lvl.toggleDesc": "Los miembros reciben XP aleatorio (15 a 30 XP) con cada mensaje enviado (cooldown 1 min).",
    "lvl.channel": "Canal de anuncio de subida de nivel",
    "lvl.channelDesc": "Donde celebrar las subidas de nivel de los miembros al ganar XP.",
    "lvl.rewardsTitle": "Roles de Nivel (Level Rewards)",
    "lvl.rewardsDesc": "Asigna roles de Discord automáticamente al alcanzar un nivel específico.",
    "lvl.leaderboardTitle": "Tabla de Niveles",

    // Giveaways
    "gw.title": "Gestión de Sorteos (Giveaways)",
    "gw.desc": "Crea y gestiona sorteos automáticos con botones interactivos en tu servidor de Discord.",
    "gw.createTitle": "Iniciar un nuevo Sorteo",
    "gw.prize": "Premio a ganar",
    "gw.prizePlaceholder": "Ej: Discord Nitro 1 Mes, 50k Monedas, Rol VIP...",
    "gw.channel": "Canal de Discord para anuncios",
    "gw.channelPlaceholder": "Seleccionar un canal de texto",
    "gw.duration": "Duración (en minutos)",
    "gw.winnersCount": "Número de ganador(es)",
    "gw.btnStart": "Iniciar Sorteo en Discord 🎉",
    "gw.starting": "Iniciando...",
    "gw.listTitle": "Sorteos del Servidor",
    "gw.noGiveaways": "No se encontraron sorteos en este servidor.",
    "gw.statusActive": "En curso",
    "gw.statusEnded": "Finalizado",
    "gw.participants": "participante(s)",
    "gw.winners": "Ganador(es):",
    "gw.noWinners": "Sin ganadores",
    "gw.btnEnd": "Terminar y Sortear 🛑",
    "gw.btnReroll": "Volver a sortear 🔄",
    "gw.btnDelete": "Eliminar 🗑️",
    "gw.confirmEnd": "¿Realmente deseas finalizar este sorteo y elegir a los ganadores ahora?",
    "gw.confirmReroll": "¿Volver a sortear un ganador entre los participantes?",
    "gw.confirmDelete": "¿Eliminar definitivamente este sorteo del historial?",
    "gw.successCreated": "¡🎉 Sorteo iniciado con éxito en Discord!",
    "gw.successEnded": "¡Sorteo finalizado y ganador(es) elegido(s) con éxito!",
    "gw.successReroll": "¡Nuevo sorteo completado con éxito!",

    // Tickets
    "tkt.title": "Gestión del Sistema de Tickets",
    "tkt.desc": "Administra la configuración de soporte, canales abiertos y envía el embed interactivo.",
    "tkt.toggle": "Activar sistema de tickets",
    "tkt.toggleDesc": "Activa la gestión de tickets privados de soporte en este servidor.",
    "tkt.category": "Categoría de Tickets Discord",
    "tkt.categoryDesc": "Categoría donde se crearán los canales de ticket.",
    "tkt.supportRole": "Rol de Soporte / Moderación",
    "tkt.supportRoleDesc": "Rol con acceso a todos los tickets creados para ayudar a miembros.",
    "tkt.logChannel": "Canal de Registros de Tickets",
    "tkt.logChannelDesc": "Canal donde registrar transcripciones y cierres de tickets.",
    "tkt.types": "Tipos de Tickets (separados por comas)",
    "tkt.deployTitle": "Desplegar panel en Discord",
    "tkt.deployDesc": "Envía un embed oficial con menú desplegable para abrir tickets.",
    "tkt.deployBtn": "Enviar panel a Discord",
    "tkt.openTicketsTitle": "Tickets Abiertos en Tiempo Real",

    // Embeds
    "emb.title": "Creador de Embeds",
    "emb.desc": "Diseña anuncios ricos con vista previa en directo y envío instantáneo a Discord.",
    "emb.sendBtn": "Enviar embed a Discord 🚀",

    // Moderación
    "warns.title": "Historial de Advertencias y Sanciones",
    "warns.desc": "Consulta miembros sancionados y revoca advertencias desde la web.",

    // Palabras
    "words.title": "Lista Negra de Palabras Prohibidas",
    "words.desc": "Los mensajes que contengan estos términos serán eliminados si el filtro está activo.",

    // General
    "gen.title": "Idioma y Ajustes Generales",
    "gen.desc": "Define el idioma en el que God_Sparky responde en Discord y en este panel.",
    "gen.langTitle": "Idioma del bot y del panel",
    "gen.langDesc": "Selecciona tu idioma preferido para la interfaz y los mensajes de Discord."
  }
}

const LanguageContext = createContext({
  lang: "fr",
  setLang: () => {},
  t: (key, fallback) => fallback || key
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("sparcky_panel_lang") || "fr"
  })

  function setLang(newLang) {
    if (["fr", "en", "es"].includes(newLang)) {
      setLangState(newLang)
      localStorage.setItem("sparcky_panel_lang", newLang)
    }
  }

  function t(key, fallback) {
    const dict = translations[lang] || translations.fr
    if (dict && dict[key]) return dict[key]
    if (translations.fr && translations.fr[key]) return translations.fr[key]
    return fallback || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function LanguageSelector({ className = "" }) {
  const { lang, setLang } = useLanguage()

  const languages = [
    { code: "fr", label: "FR", flag: "🇫🇷", full: "Français" },
    { code: "en", label: "EN", flag: "🇬🇧", full: "English" },
    { code: "es", label: "ES", flag: "🇪🇸", full: "Español" }
  ]

  return (
    <div className={`flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/80 p-1 backdrop-blur ${className}`}>
      {languages.map(l => {
        const isSelected = lang === l.code
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            title={l.full}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
              isSelected
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </button>
        )
      })}
    </div>
  )
}
