import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { clearJwt, getJwt } from "../lib/auth"

const API_BASE_URL = ""

function Toggle({ checked, onChange, disabled = false, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 transition hover:border-white/10">
      <div className="min-w-0 flex-1">
        <label className="text-sm font-semibold text-slate-100">{label}</label>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-indigo-600" : "bg-slate-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

function SelectField({ label, description, value, onChange, options, placeholder = "Aucun (désactivé)" }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 transition hover:border-white/10">
      <label className="text-sm font-semibold text-slate-100">{label}</label>
      {description && <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>}
      <div className="mt-3">
        <select
          value={value || ""}
          onChange={e => onChange(e.target.value || null)}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-100">
              {opt.prefix ? `${opt.prefix} ` : ""}{opt.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function GuildPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const token = useMemo(() => getJwt(), [])

  const [status, setStatus] = useState("loading") // loading | ready | error
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Configuration locale éditable
  const [config, setConfig] = useState(null)
  const [savedConfigStr, setSavedConfigStr] = useState("")

  // Onglet actif
  const [activeTab, setActiveTab] = useState("channels") // channels | security | words | settings

  // Sauvegarde
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null) // { type: 'success'|'error', text: string }

  // Mot interdit temporaire pour le champ d'ajout
  const [newWordInput, setNewWordInput] = useState("")

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
        const res = await fetch(`${API_BASE_URL}/api/guilds/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.status === 401) {
          logout()
          return
        }

        const isJson = (res.headers.get("content-type") || "").includes("application/json")
        if (!res.ok) {
          const payload = isJson ? await res.json().catch(() => null) : null
          throw new Error(payload?.error || `Erreur API (${res.status})`)
        }

        const payload = await res.json()
        if (cancelled) return

        setData(payload)
        const initialCfg = payload?.config || {}
        setConfig(initialCfg)
        setSavedConfigStr(JSON.stringify(initialCfg))
        setStatus("ready")
      } catch (e) {
        if (cancelled) return
        setError(e?.message || "Impossible de charger ce serveur")
        setStatus("error")
      }
    }

    if (!token) {
      logout()
      return
    }

    if (!id) {
      setError("Identifiant de serveur manquant")
      setStatus("error")
      return
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, token])

  // Détection des modifications
  const hasChanges = useMemo(() => {
    if (!config) return false
    return JSON.stringify(config) !== savedConfigStr
  }, [config, savedConfigStr])

  // Séparation des channels textuels vs vocaux
  const textChannels = useMemo(() => {
    const raw = data?.channels || []
    return raw
      .filter(ch => ch.type === 0 || ch.type === 5)
      .map(ch => ({ id: ch.id, name: ch.name || ch.id, prefix: "#" }))
  }, [data?.channels])

  const voiceChannels = useMemo(() => {
    const raw = data?.channels || []
    return raw
      .filter(ch => ch.type === 2 || ch.type === 13)
      .map(ch => ({ id: ch.id, name: ch.name || ch.id, prefix: "🔊" }))
  }, [data?.channels])

  const roles = useMemo(() => {
    return data?.roles || []
  }, [data?.roles])

  // Handler de mise à jour locale de la config
  function updateField(key, val) {
    setConfig(prev => ({
      ...prev,
      [key]: val
    }))
    setSaveMessage(null)
  }

  // Ajout d'un mot interdit
  function addBadWord() {
    const word = newWordInput.trim().toLowerCase()
    if (!word) return

    const currentWords = Array.isArray(config?.badWords) ? config.badWords : []
    if (currentWords.includes(word)) {
      setNewWordInput("")
      return
    }

    updateField("badWords", [...currentWords, word])
    setNewWordInput("")
  }

  // Suppression d'un mot interdit
  function removeBadWord(wordToRemove) {
    const currentWords = Array.isArray(config?.badWords) ? config.badWords : []
    updateField(
      "badWords",
      currentWords.filter(w => w !== wordToRemove)
    )
  }

  // Réinitialiser les changements
  function handleReset() {
    try {
      setConfig(JSON.parse(savedConfigStr))
      setSaveMessage(null)
    } catch {
      // Ignorer
    }
  }

  // Enregistrer sur l'API
  async function handleSave() {
    if (!hasChanges || saving) return

    setSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/config`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      })

      const isJson = (res.headers.get("content-type") || "").includes("application/json")
      if (!res.ok) {
        const payload = isJson ? await res.json().catch(() => null) : null
        throw new Error(payload?.error || `Erreur d'enregistrement (${res.status})`)
      }

      const payload = await res.json()
      const newConfig = payload?.config || config
      setConfig(newConfig)
      setSavedConfigStr(JSON.stringify(newConfig))
      setSaveMessage({ type: "success", text: "Configuration enregistrée avec succès !" })

      setTimeout(() => {
        setSaveMessage(null)
      }, 4000)
    } catch (err) {
      setSaveMessage({ type: "error", text: err?.message || "Échec de l'enregistrement" })
    } finally {
      setSaving(false)
    }
  }

  const guild = data?.guild
  const bot = data?.bot
  const botInGuild = Boolean(data?.botInGuild)
  const inviteUrl = data?.inviteUrl || `https://discord.com/oauth2/authorize?client_id=${bot?.id || "1275197373580050604"}&scope=bot%20applications.commands&permissions=8`

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Halos lumineux d'ambiance */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              {bot?.avatarUrl ? (
                <img
                  src={bot.avatarUrl}
                  alt={bot.username}
                  className="h-8 w-8 rounded-full ring-2 ring-indigo-500/30"
                />
              ) : null}
              <div className="leading-tight">
                <p className="text-sm font-bold tracking-tight text-white">{bot?.username || "God_Sparky"}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En ligne</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-rose-300"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6">
        {status === "loading" && (
          <div className="space-y-6">
            <div className="h-32 animate-pulse rounded-3xl bg-slate-900/60 ring-1 ring-white/10" />
            <div className="h-96 animate-pulse rounded-3xl bg-slate-900/60 ring-1 ring-white/10" />
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">Impossible de charger le serveur</h2>
            <p className="mt-2 text-sm text-rose-200/80">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/dashboard"
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
              >
                Retour aux serveurs
              </Link>
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-8">
            {/* Header du Serveur */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  {guild?.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10 shadow-xl"
                    />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-2xl bg-indigo-600/20 font-bold text-2xl text-indigo-300 ring-2 ring-indigo-500/30 shadow-xl">
                      {(guild?.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      {guild?.name ?? "Serveur Discord"}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-slate-400">ID: {guild?.id || id}</span>
                      <span className="text-slate-600">•</span>
                      {botInGuild ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          God_Sparky actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-0.5 font-medium text-rose-300 ring-1 ring-rose-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          Bot non invité
                        </span>
                      )}
                      {channelsCountBadge(textChannels.length, voiceChannels.length)}
                    </div>
                  </div>
                </div>

                {!botInGuild && (
                  <div>
                    <a
                      href={inviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Inviter God_Sparky</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Alerte si le bot n'est pas dans la guilde */}
            {!botInGuild && (
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-amber-200">God_Sparky n'a pas encore rejoint ce serveur</h3>
                    <p className="mt-1 text-sm leading-relaxed text-amber-200/80">
                      Pour configurer les salons, rôles et protections automatiques, vous devez d'abord inviter le bot avec les permissions requises. Une fois l'invitation effectuée sur Discord, rechargez simplement cette page.
                    </p>
                    <div className="mt-4">
                      <a
                        href={inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                      >
                        Autoriser et inviter sur Discord →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Menu d'onglets de configuration */}
            {botInGuild && (
              <>
                <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                  <TabButton
                    active={activeTab === "channels"}
                    onClick={() => setActiveTab("channels")}
                    icon="📌"
                    label="Salons & Rôles"
                  />
                  <TabButton
                    active={activeTab === "security"}
                    onClick={() => setActiveTab("security")}
                    icon="🛡️"
                    label="Sécurité & Modération"
                  />
                  <TabButton
                    active={activeTab === "words"}
                    onClick={() => setActiveTab("words")}
                    icon="🚫"
                    label={`Mots Interdits (${config?.badWords?.length || 0})`}
                  />
                  <TabButton
                    active={activeTab === "settings"}
                    onClick={() => setActiveTab("settings")}
                    icon="⚙️"
                    label="Langue & Général"
                  />
                </div>

                {/* Section 1 : Salons & Rôles */}
                {activeTab === "channels" && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Salons Textuels et Vocaux</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Sélectionnez les salons dédiés aux événements automatiques de God_Sparky.
                      </p>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <SelectField
                          label="Salon de Bienvenue"
                          description="Salon où le message d'arrivée d'un nouveau membre est envoyé."
                          value={config?.welcomeChannel}
                          onChange={val => updateField("welcomeChannel", val)}
                          options={textChannels}
                        />

                        <SelectField
                          label="Salon de Départ"
                          description="Salon où le message d'au revoir lorsqu'un membre quitte le serveur est diffusé."
                          value={config?.leaveChannel}
                          onChange={val => updateField("leaveChannel", val)}
                          options={textChannels}
                        />

                        <SelectField
                          label="Salon des Logs de Modération"
                          description="Enregistre tous les événements de modération (avertissements, kicks, bans, suppressions de messages)."
                          value={config?.modLogChannel}
                          onChange={val => updateField("modLogChannel", val)}
                          options={textChannels}
                        />

                        <SelectField
                          label="Salon Vocal Hub (Temporaires)"
                          description="Rejoindre ce salon déclenchera la création d'un vocal temporaire dédié pour le membre."
                          value={config?.vocChannelId}
                          onChange={val => updateField("vocChannelId", val)}
                          options={voiceChannels}
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Attribution Automatique des Rôles</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Attribuez automatiquement un rôle dès l'entrée sur le serveur Discord.
                      </p>

                      <div className="mt-6 max-w-xl">
                        <SelectField
                          label="Rôle Automatique (Auto-Role)"
                          description="Rôle attribué instantanément à tous les nouveaux membres."
                          value={config?.autoRole}
                          onChange={val => updateField("autoRole", val)}
                          options={roles}
                          placeholder="Aucun (pas de rôle automatique)"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 2 : Sécurité & Modération */}
                {activeTab === "security" && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                    <h2 className="text-lg font-bold text-white">Systèmes de Sécurité & Modération</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Activez les protections automatiques opérées en temps réel par God_Sparky sur votre serveur.
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <Toggle
                        label="Protection Anti-Lien (Anti-Link)"
                        description="Supprime automatiquement les liens d'invitation Discord et URL douteuses publiées par les membres non-administrateurs."
                        checked={Boolean(config?.antilink)}
                        onChange={v => updateField("antilink", v)}
                      />

                      <Toggle
                        label="Protection Anti-Spam"
                        description="Détecte et supprime les messages répétitifs ou envoyés trop rapidement à haute fréquence."
                        checked={Boolean(config?.antispam)}
                        onChange={v => updateField("antispam", v)}
                      />

                      <Toggle
                        label="Filtre Anti-Insultes (Anti-BadWords)"
                        description="Censure automatiquement les insultes et le vocabulaire offensant défini dans la liste de mots interdits."
                        checked={Boolean(config?.antiBadWords)}
                        onChange={v => updateField("antiBadWords", v)}
                      />

                      <Toggle
                        label="Sanctions Automatiques (Auto-Sanction)"
                        description="Applique des sanctions graduelles (avertissements, temporisations) automatiquement en cas de récidives."
                        checked={Boolean(config?.autoSanction)}
                        onChange={v => updateField("autoSanction", v)}
                      />

                      <div className="md:col-span-2">
                        <Toggle
                          label="Mode Anti-Raid Renforcé"
                          description="Active une surveillance stricte en cas de vague suspecte d'arrivées massives de comptes sur le serveur."
                          checked={Boolean(config?.antiRaid)}
                          onChange={v => updateField("antiRaid", v)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3 : Mots Interdits */}
                {activeTab === "words" && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                    <h2 className="text-lg font-bold text-white">Liste des Mots Interdits</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Les messages contenant ces termes seront automatiquement supprimés si le filtre Anti-Insultes est activé.
                    </p>

                    {/* Formulaire d'ajout */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={newWordInput}
                          onChange={e => setNewWordInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addBadWord()
                            }
                          }}
                          placeholder="Ajouter un mot ou une expression... (Ex: spam, scam)"
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addBadWord}
                        className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
                      >
                        + Ajouter le mot
                      </button>
                    </div>

                    {/* Liste des tags */}
                    <div className="mt-6">
                      {Array.isArray(config?.badWords) && config.badWords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {config.badWords.map(word => (
                            <span
                              key={word}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200"
                            >
                              <span>{word}</span>
                              <button
                                type="button"
                                onClick={() => removeBadWord(word)}
                                className="text-slate-400 transition hover:text-rose-400"
                                title="Supprimer ce mot"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                          <p className="text-sm text-slate-400">Aucun mot personnalisé dans la liste pour l'instant.</p>
                          <p className="mt-1 text-xs text-slate-500">Ajoutez des mots ci-dessus pour compléter le dictionnaire par défaut.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 4 : Langue & Général */}
                {activeTab === "settings" && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                    <h2 className="text-lg font-bold text-white">Langue et Préférences</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Définissez la langue dans laquelle God_Sparky répond aux commandes et envoie ses notifications.
                    </p>

                    <div className="mt-6 grid max-w-xl gap-3">
                      {[
                        { code: "fr", label: "Français", flag: "🇫🇷" },
                        { code: "en", label: "English", flag: "🇬🇧" },
                        { code: "es", label: "Español", flag: "🇪🇸" }
                      ].map(lang => {
                        const isSelected = (config?.language || "fr") === lang.code
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => updateField("language", lang.code)}
                            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? "border-indigo-500/60 bg-indigo-600/10 text-white"
                                : "border-white/5 bg-slate-950/40 text-slate-300 hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{lang.flag}</span>
                              <span className="text-sm font-semibold">{lang.label}</span>
                            </div>
                            {isSelected && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Barre d'action fixe en bas lors de modifications */}
      {hasChanges && (
        <div className="fixed bottom-6 inset-x-0 z-50 px-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-slide-up">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-ping" />
              <p className="text-sm font-medium text-slate-200">
                Vous avez des modifications non enregistrées
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>Enregistrer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed top-20 right-6 z-50">
          <div
            className={`flex items-center gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl ${
              saveMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                : "border-rose-500/30 bg-rose-950/80 text-rose-200"
            }`}
          >
            {saveMessage.type === "success" ? (
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{saveMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
          : "border border-white/5 bg-slate-900/60 text-slate-300 hover:border-white/10 hover:bg-slate-900"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function channelsCountBadge(textCount, voiceCount) {
  if (textCount === 0 && voiceCount === 0) return null
  return (
    <>
      <span className="text-slate-600">•</span>
      <span className="text-slate-400">
        {textCount} salons textuels, {voiceCount} vocaux
      </span>
    </>
  )
}
