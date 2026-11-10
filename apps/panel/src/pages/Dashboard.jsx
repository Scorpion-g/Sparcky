import { useEffect, useMemo, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { clearJwt, getJwt } from "../lib/auth"
import { useLanguage, LanguageSelector } from "../lib/i18n"

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const token = useMemo(() => getJwt(), [])

  const [status, setStatus] = useState("loading") // loading | ready | error
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("admin") // "admin" | "with_bot" | "to_invite" | "all"
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState(null)

  async function handleBroadcast() {
    if (!window.confirm("Diffuser l'annonce officielle v2.0.0 sur TOUS les serveurs où le bot est connecté ?")) return
    setBroadcastLoading(true)
    setBroadcastResult(null)
    try {
      const res = await fetch("/api/admin/broadcast-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ version: "2.0.0", force: true })
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || "Échec de la diffusion")
      setBroadcastResult(payload)
    } catch (err) {
      alert("Erreur de diffusion : " + err.message)
    } finally {
      setBroadcastLoading(false)
    }
  }

  function logout() {
    clearJwt()
    navigate("/login", { replace: true })
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus("loading")
      setError(null)

      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.status === 401) {
          logout()
          return
        }

        const payload = await res.json()
        if (cancelled) return

        if (!res.ok) {
          throw new Error(payload?.error || "Erreur lors du chargement")
        }

        setData(payload)
        setStatus("ready")
      } catch (err) {
        if (cancelled) return
        setError(err?.message || "Impossible de contacter l'API")
        setStatus("error")
      }
    }

    if (!token) {
      logout()
      return
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const user = data?.user
  const bot = data?.bot
  const allGuilds = data?.guilds || []

  // Filtrage selon onglet et recherche
  const filteredGuilds = useMemo(() => {
    return allGuilds.filter(guild => {
      // Filtre de recherche par nom ou ID
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesName = (guild.name || "").toLowerCase().includes(q)
        const matchesId = (guild.id || "").includes(q)
        if (!matchesName && !matchesId) return false
      }

      // Filtre selon l'onglet
      if (activeTab === "admin") {
        return guild.isAdmin
      }
      if (activeTab === "with_bot") {
        return guild.botInGuild
      }
      if (activeTab === "to_invite") {
        return guild.isAdmin && !guild.botInGuild
      }
      return true // "all"
    })
  }, [allGuilds, search, activeTab])

  // Statistiques rapides
  const stats = useMemo(() => {
    const adminCount = allGuilds.filter(g => g.isAdmin).length
    const withBotCount = allGuilds.filter(g => g.botInGuild).length
    const toInviteCount = allGuilds.filter(g => g.isAdmin && !g.botInGuild).length
    return { adminCount, withBotCount, toInviteCount }
  }, [allGuilds])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barre de navigation supérieure */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Bot info (PP du bot + Nom + Status) */}
          <div className="flex items-center gap-3">
            <div className="relative">
              {bot?.avatarUrl ? (
                <img
                  src={bot.avatarUrl}
                  alt={bot.username}
                  className="h-11 w-11 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/10"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white font-bold ring-2 ring-white/10">
                  S
                </div>
              )}
              {/* Badge vert en ligne */}
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-500" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white leading-none">{bot?.username || "Sparcky"}</h1>
                <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                  BOT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Panneau d'administration</p>
            </div>
          </div>

          {/* User info + Langue + Déconnexion */}
          <div className="flex items-center gap-3">
            <LanguageSelector />

            {user && (
              <div className="hidden sm:flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="h-7 w-7 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-slate-800 text-xs font-semibold text-slate-200">
                    {(user.username || "?").slice(0, 1)}
                  </div>
                )}
                <span className="text-sm font-medium text-slate-200">{user.username}</span>
              </div>
            )}

            <button
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Titre & Statistiques */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{t("dash.title")}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {t("dash.subtitle")}
            </p>
          </div>

          {/* Cartes statistiques */}
          <div className="flex items-center gap-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-slate-400">{t("dash.tabAdmin")} :</span>{" "}
              <span className="font-bold text-white">{stats.adminCount}</span>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <span className="text-emerald-300">{t("dash.tabWithBot")} :</span>{" "}
              <span className="font-bold text-emerald-100">{stats.withBotCount}</span>
            </div>
          </div>
        </div>

        {/* Bannière de Versioning & Diffusion Globale */}
        <div className="mb-8 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/30 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
                📢
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Mise à Jour Majeure v2.0.0 Prête</h3>
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Système Automatisé
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Diffusez l'annonce officielle de la mise à jour (Panel Web, Économie, Niveaux, Tickets) sur <strong>tous les {allGuilds.filter(g => g.botInGuild).length} serveurs connectés</strong> en un clic.
                </p>
              </div>
            </div>

            <button
              onClick={handleBroadcast}
              disabled={broadcastLoading}
              className="shrink-0 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {broadcastLoading ? "Diffusion en cours..." : "Diffuser la MAJ sur tous les serveurs 🚀"}
            </button>
          </div>

          {/* Résultat de la diffusion */}
          {broadcastResult && (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
              <div className="flex items-center justify-between text-emerald-300 font-bold mb-2">
                <span>✅ Diffusion terminée : {broadcastResult.sentCount}/{broadcastResult.totalGuilds} serveurs notifiés avec succès</span>
                <button onClick={() => setBroadcastResult(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {broadcastResult.details?.map(d => (
                  <span
                    key={d.guildId}
                    className={`rounded-lg px-2.5 py-1 font-medium ${
                      d.status === "sent"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : d.status === "skipped"
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-rose-500/20 text-rose-200"
                    }`}
                  >
                    {d.status === "sent" ? `✓ ${d.guildName} (#${d.channelName})` : `${d.guildName} (${d.reason})`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barre de filtres et recherche */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Onglets de filtres */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-slate-900/80 p-1">
            <button
              onClick={() => setActiveTab("admin")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "admin"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("dash.tabAdmin")} ({stats.adminCount})
            </button>
            <button
              onClick={() => setActiveTab("with_bot")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "with_bot"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("dash.tabWithBot")} ({stats.withBotCount})
            </button>
            <button
              onClick={() => setActiveTab("to_invite")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "to_invite"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("dash.tabToInvite")} ({stats.toInviteCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "all"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("dash.tabAll")} ({allGuilds.length})
            </button>
          </div>

          {/* Champ de recherche */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("dash.searchPlaceholder")}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* État de chargement */}
        {status === "loading" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-3xl border border-white/5 bg-slate-900/40 p-5" />
            ))}
          </div>
        )}

        {/* État d'erreur */}
        {status === "error" && (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
            <p className="font-semibold text-base">{t("common.error")}</p>
            <p className="mt-1 text-rose-300/80">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-500 transition"
            >
              {t("common.refresh")}
            </button>
          </div>
        )}

        {/* Aucun résultat */}
        {status === "ready" && filteredGuilds.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/30 py-16 text-center">
            <p className="text-base font-semibold text-slate-300">{t("dash.noServer")}</p>
          </div>
        )}

        {/* Grille des serveurs (Cards modernes) */}
        {status === "ready" && filteredGuilds.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGuilds.map(guild => {
              const initial = (guild.name || "?").slice(0, 1).toUpperCase()

              return (
                <div
                  key={guild.id}
                  className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur transition hover:border-indigo-500/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-indigo-500/5"
                >
                  {/* Haut de la carte : Icône + Nom + Badges */}
                  <div>
                    <div className="flex items-start gap-3.5">
                      {guild.iconUrl ? (
                        <img
                          src={guild.iconUrl}
                          alt={guild.name}
                          className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600/20 text-base font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                          {initial}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-white group-hover:text-indigo-200 transition">
                          {guild.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {guild.owner ? (
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                              {t("dash.roleOwner")}
                            </span>
                          ) : guild.isAdmin ? (
                            <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                              {t("dash.roleAdmin")}
                            </span>
                          ) : (
                            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-white/10">
                              {t("dash.roleMember")}
                            </span>
                          )}

                          {guild.botInGuild ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {t("dash.statusPresent")}
                            </span>
                          ) : (
                            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-white/10">
                              {t("dash.statusNotInvited")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action en bas */}
                  <div className="mt-5 pt-4 border-t border-white/5">
                    {guild.botInGuild ? (
                      <Link
                        to={`/guild/${guild.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition"
                      >
                        {t("dash.btnConfigure")}
                      </Link>
                    ) : guild.isAdmin ? (
                      <a
                        href={guild.inviteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20 hover:text-white transition"
                      >
                        {t("dash.btnInvite")}
                      </a>
                    ) : (
                      <button
                        disabled
                        className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-500 cursor-not-allowed"
                      >
                        Accès restreint (Admin requis)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer avec liens légaux pour la vérification Discord */}
      <footer className="border-t border-white/10 bg-slate-900/40 py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 God_Sparky. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-slate-300 transition">Conditions d'Utilisation (Terms)</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-slate-300 transition">Politique de Confidentialité (Privacy)</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
