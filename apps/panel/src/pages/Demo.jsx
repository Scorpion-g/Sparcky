import React, { useState } from "react"
import { Link } from "react-router-dom"
import { useLanguage, LanguageSelector } from "../lib/i18n"

const BOT_INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1285215781363617872&permissions=8&scope=bot%20applications.commands"

export default function Demo() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("security")
  const [toastMessage, setToastMessage] = useState(null)

  // États interactifs simulés
  const [config, setConfig] = useState({
    antilink: true,
    antispam: true,
    antiRaid: false,
    antiBadWords: true,
    autoSanction: true,
    economyEnabled: true,
    dailyAmount: 500,
    workMin: 50,
    workMax: 250,
    xpEnabled: true,
    ticketEnabled: true,
  })

  const [giveaways, setGiveaways] = useState([
    {
      id: "demo-1",
      prize: "Discord Nitro 1 Mois 🎉",
      winners: 1,
      participantsCount: 42,
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      joined: false,
    },
    {
      id: "demo-2",
      prize: "Rôle Exclusif VIP + 10,000 Coins 🪙",
      winners: 3,
      participantsCount: 88,
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      joined: true,
    },
  ])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const toggleConfig = (key) => {
    setConfig((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      showToast(
        t("demo.toastModule", `Module ${key} ${updated[key] ? "activé" : "désactivé"} (Simulation)`, {
          name: key,
          state: updated[key] ? t("demo.toastEnabled", "activé") : t("demo.toastDisabled", "désactivé"),
        })
      )
      return updated
    })
  }

  const toggleJoinGiveaway = (id) => {
    setGiveaways((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g
        const joined = !g.joined
        showToast(
          joined
            ? t("demo.toastJoined", `Vous avez rejoint le concours pour "${g.prize}" !`, { prize: g.prize })
            : t("demo.toastLeft", `Participation annulée pour "${g.prize}".`, { prize: g.prize })
        )
        return {
          ...g,
          joined,
          participantsCount: joined ? g.participantsCount + 1 : g.participantsCount - 1,
        }
      })
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-600/30 border border-white/20 animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Mode Démo */}
      <header className="border-b border-indigo-500/20 bg-indigo-950/40 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/login" className="flex items-center gap-2">
              <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
                God_Sparky
              </span>
            </Link>
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300 animate-pulse">
              {t("demo.badge", "🎮 DÉMO INTERACTIVE")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />

            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs sm:text-sm font-bold px-4 py-2 shadow-lg shadow-indigo-600/30 transition transform hover:scale-105"
            >
              <span>{t("demo.invite", "+ Inviter Sparcky")}</span>
            </a>

            <Link
              to="/login"
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs sm:text-sm font-semibold px-3 py-2 transition"
            >
              {t("demo.login", "Connexion")}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Intro Card */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-900/30 via-slate-900/60 to-purple-900/20 p-6 sm:p-8 backdrop-blur shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {t("demo.welcomeTitle", "Bienvenue dans le Sandbox Démo de God_Sparky")}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            {t(
              "demo.welcomeDesc",
              "Découvrez et manipulez toutes les fonctionnalités du bot comme si vous étiez dans votre propre serveur. Basculez les modules, rejoignez un giveaway virtuel ou testez le Blind Test sans aucun compte requis !"
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              {
                id: "security",
                label: t("demo.tabSecurity", "🛡️ Sécurité & Auto-Mod"),
                desc: t("demo.tabSecurityDesc", "Anti-lien, anti-spam, confinement"),
              },
              {
                id: "economy",
                label: t("demo.tabEconomy", "🪙 Économie & Niveaux"),
                desc: t("demo.tabEconomyDesc", "Coins, salaires, récompenses"),
              },
              {
                id: "giveaways",
                label: t("demo.tabGiveaways", "🎉 Giveaways"),
                desc: t("demo.tabGiveawaysDesc", "Tirages au sort interactifs"),
              },
              {
                id: "blindtest",
                label: t("demo.tabBlindtest", "🎧 Blind Test Vocal"),
                desc: t("demo.tabBlindtestDesc", "6 thèmes musicaux Deezer"),
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col text-left px-4 py-2.5 rounded-2xl border transition ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30"
                    : "bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800"
                }`}
              >
                <span className="font-bold text-sm">{tab.label}</span>
                <span className="text-[11px] opacity-75">{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: Sécurité */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🛡️</span> {t("demo.secTitle", "Modules de Protection")}
              </h2>
              <p className="text-xs text-slate-400">
                {t("demo.secSubtitle", "Activez ou désactivez les défenses en direct.")}
              </p>

              <div className="space-y-3">
                {[
                  {
                    key: "antilink",
                    label: t("demo.secAntilink", "Protection Anti-Lien"),
                    desc: t("demo.secAntilinkDesc", "Supprime les invitations et liens suspects"),
                  },
                  {
                    key: "antispam",
                    label: t("demo.secAntispam", "Protection Anti-Spam"),
                    desc: t("demo.secAntispamDesc", "Bloque le flood et messages répétés"),
                  },
                  {
                    key: "antiRaid",
                    label: t("demo.secAntiraid", "Confinement Anti-Raid"),
                    desc: t("demo.secAntiraidDesc", "Expulse les raids d'utilisateurs massifs"),
                  },
                  {
                    key: "antiBadWords",
                    label: t("demo.secAntibadwords", "Censure des Mots Interdits"),
                    desc: t("demo.secAntibadwordsDesc", "Filtre le langage inapproprié"),
                  },
                  {
                    key: "autoSanction",
                    label: t("demo.secAutosanctions", "Sanctions Automatiques"),
                    desc: t("demo.secAutosanctionsDesc", "3 warns = mute, 5 = kick, 7 = ban"),
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-200">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => toggleConfig(item.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        config[item.key] ? "bg-emerald-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          config[item.key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📜</span> {t("demo.secLogsTitle", "Simulation Logs de Sécurité")}
                </h2>
                <p className="text-xs text-slate-400">
                  {t(
                    "demo.secLogsSubtitle",
                    "Aperçu des alertes envoyées en direct aux modérateurs dans le salon de logs."
                  )}
                </p>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300">
                    {t("demo.secLog1", "[INFO] Sécurité opérationnelle • 0 incident critique dans les dernières 24h")}
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/20 text-amber-300">
                    {t(
                      "demo.secLog2",
                      "[AUTO-MOD] Message de @SpamUser supprimé (Lien suspect bloqué dans #général)"
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-300">
                    {t(
                      "demo.secLog3",
                      "[WARN] Seuil 3 avertissements atteint : @BadActor mis en sourdine pendant 10m"
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-950/30 border border-indigo-500/20 p-4 text-xs text-indigo-200">
                💡 <strong>{t("demo.secTipReady", "Prêt pour votre serveur ?")}</strong>{" "}
                {t(
                  "demo.secTipCmd",
                  "Utilisez la commande /security status directement sur Discord !"
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Economie */}
        {activeTab === "economy" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🪙</span> {t("demo.ecoConfigTitle", "Configuration Économique")}
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                  <div>
                    <div className="font-semibold text-sm text-slate-200">
                      {t("demo.ecoGlobal", "Système Économique Global")}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t("demo.ecoGlobalDesc", "Active les commandes /work, /daily, /coinflip, /pay")}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConfig("economyEnabled")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      config.economyEnabled ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        config.economyEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">
                      {t("demo.ecoDaily", "Récompense Quotidienne (/daily) :")}
                    </span>
                    <span className="font-bold text-amber-400">500 Coins</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">{t("demo.ecoSalary", "Salaire (/work) :")}</span>
                    <span className="font-bold text-emerald-400">
                      {t("demo.ecoSalaryVal", "50 à 250 Coins")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">
                      {t("demo.ecoCoinflip", "Mini-jeu Pile ou Face (/coinflip) :")}
                    </span>
                    <span className="font-bold text-indigo-400">
                      {t("demo.ecoCoinflipVal", "Mise x2")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏆</span> {t("demo.ecoRankingTitle", "Classement Fictif Démo")}
              </h2>

              <div className="space-y-2 text-sm">
                {[
                  { rank: "🥇", name: "Alexandre_94", level: 24, coins: "45,200", xp: "12,450 XP" },
                  { rank: "🥈", name: "Sarah_Gamer", level: 19, coins: "32,800", xp: "9,800 XP" },
                  { rank: "🥉", name: "Maxime_Dev", level: 15, coins: "21,500", xp: "7,200 XP" },
                  {
                    rank: "4️⃣",
                    name: t("demo.ecoYouGuest", "Vous (Invité)"),
                    level: 8,
                    coins: "6,500",
                    xp: "3,100 XP",
                  },
                ].map((user) => (
                  <div
                    key={user.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{user.rank}</span>
                      <span className="font-semibold text-slate-200">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-indigo-300 font-bold">
                        {t("demo.ecoLvlPrefix", "Niv.")} {user.level}
                      </span>
                      <span className="text-amber-300 font-bold">{user.coins} 🪙</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Giveaways */}
        {activeTab === "giveaways" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🎉</span> {t("demo.gwSimTitle", "Simulateur de Giveaways Discord")}
                </h2>
                <p className="text-xs text-slate-400">
                  {t(
                    "demo.gwSimSubtitle",
                    "Cliquez sur \"Participer\" pour simuler une inscription de joueur en direct !"
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {giveaways.map((gw) => (
                <div
                  key={gw.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-4 backdrop-blur shadow-xl relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-300">
                        {gw.winners} {t("demo.gwWinnersSuffix", "gagnant(s)")}
                      </span>
                      <h3 className="mt-2 text-lg font-extrabold text-white">{gw.prize}</h3>
                    </div>
                    <span className="text-3xl">🎁</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 border-y border-white/5 py-3">
                    <div>
                      👥 {t("demo.gwParticipants", "Participants :")}{" "}
                      <strong className="text-slate-200">{gw.participantsCount}</strong>
                    </div>
                    <div>
                      ⏳ {t("demo.gwEndsIn", "Fin : Dans 24 heures")}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleJoinGiveaway(gw.id)}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-lg ${
                      gw.joined
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                    }`}
                  >
                    {gw.joined
                      ? t("demo.gwYouParticipate", "✅ Vous participez (Cliquez pour quitter)")
                      : t("demo.gwEnterBtn", "🎉 Participer au concours")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Blind Test */}
        {activeTab === "blindtest" && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎧</span> {t("demo.btTitle", "Blind Test Vocal Multijoueur")}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {t(
                  "demo.btSubtitle",
                  "Sparcky diffuse des extraits musicaux HD directement dans votre salon vocal Discord. Les joueurs écrivent leurs réponses dans le chat avec reconnaissance intelligente et tolérance aux fautes de frappe !"
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: t("demo.themeHitsTitle", "Top Hits Français & US"),
                  emoji: "🔥",
                  desc: t("demo.themeHitsDesc", "Shakira, Dua Lipa, The Weeknd, Vacra, Aya..."),
                },
                {
                  title: t("demo.theme80sTitle", "Années 80 & 90"),
                  emoji: "🕺",
                  desc: t("demo.theme80sDesc", "Sweet Dreams, Billie Jean, Goldman, Gala, Eurythmics..."),
                },
                {
                  title: t("demo.themeRapTitle", "Rap Français & US"),
                  emoji: "🎤",
                  desc: t("demo.themeRapDesc", "Ninho, Tiakola, Eminem, Damso, Gambi, Drake..."),
                },
                {
                  title: t("demo.themeDisneyTitle", "Disney & Dessins Animés"),
                  emoji: "🏰",
                  desc: t("demo.themeDisneyDesc", "Libérée Délivrée, Roi Lion, Aladdin, Vaiana, Coco..."),
                },
                {
                  title: t("demo.themeMoviesTitle", "Films & BO Cultes"),
                  emoji: "🍿",
                  desc: t("demo.themeMoviesDesc", "Star Wars, Grease, Pirates des Caraïbes, Interstellar..."),
                },
                {
                  title: t("demo.themeAnimeTitle", "Anime & Gaming"),
                  emoji: "🎮",
                  desc: t("demo.themeAnimeDesc", "Naruto, Demon Slayer, Tokyo Ghoul, Evangelion, Mario..."),
                },
              ].map((theme) => (
                <div
                  key={theme.title}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2 hover:border-indigo-500/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{theme.emoji}</span>
                    <span className="font-bold text-sm text-white">{theme.title}</span>
                  </div>
                  <p className="text-xs text-slate-400">{theme.desc}</p>
                  <div className="text-[11px] font-semibold text-emerald-400">
                    {t("demo.btDeezerVerified", "✓ Playlists Deezer officielles vérifiées")}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-white">
                  {t("demo.btQuickStart", "Lancez une partie sur Discord en 1 seconde :")}
                </div>
                <div className="text-xs text-slate-300">
                  {t(
                    "demo.btQuickStartCmd",
                    "Tapez {cmd} dans votre salon vocal !",
                    { cmd: "/blindtest start theme:disney rounds:10 duration:30" }
                  )}
                </div>
              </div>
              <a
                href={BOT_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 shadow-lg shadow-indigo-600/30 whitespace-nowrap"
              >
                {t("demo.btTryBtn", "Essayer sur mon serveur →")}
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div>{t("demo.footerCredit", "God_Sparky © 2026 • Développé avec passion pour Discord")}</div>
        <div className="mt-2 space-x-4">
          <Link to="/terms" className="hover:underline">
            {t("demo.footerTerms", "Conditions d'Utilisation")}
          </Link>
          <Link to="/privacy" className="hover:underline">
            {t("demo.footerPrivacy", "Politique de Confidentialité")}
          </Link>
          <Link to="/login" className="hover:underline text-indigo-400">
            {t("demo.footerLogin", "Connexion Panel")}
          </Link>
        </div>
      </footer>
    </div>
  )
}
