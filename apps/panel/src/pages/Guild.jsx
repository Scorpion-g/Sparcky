import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { clearJwt, getJwt } from "../lib/auth"
import { useLanguage, LanguageSelector } from "../lib/i18n"

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
  const { t, lang: panelLang, setLang } = useLanguage()
  const token = useMemo(() => getJwt(), [])

  const [status, setStatus] = useState("loading") // loading | ready | error
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Configuration locale éditable
  const [config, setConfig] = useState(null)
  const [savedConfigStr, setSavedConfigStr] = useState("")

  // Onglet actif
  const [activeTab, setActiveTab] = useState("channels") // channels | security | economy | leveling | tickets | embeds | warns | words | settings

  // Sauvegarde
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null) // { type: 'success'|'error', text: string }

  // Mot interdit temporaire pour le champ d'ajout
  const [newWordInput, setNewWordInput] = useState("")

  // Données Boutique & Économie
  const [shopItems, setShopItems] = useState([])
  const [economyLeaderboard, setEconomyLeaderboard] = useState([])
  const [shopLoading, setShopLoading] = useState(false)
  const [showShopModal, setShowShopModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: 100, stock: -1, type: "role", roleId: "" })

  // Ajustement de solde
  const [balanceModalUser, setBalanceModalUser] = useState(null)
  const [adjustAmount, setAdjustAmount] = useState(500)
  const [adjustAction, setAdjustAction] = useState("add")

  // Données Niveaux & XP
  const [xpLeaderboard, setXpLeaderboard] = useState([])
  const [newLevelRoleLevel, setNewLevelRoleLevel] = useState(5)
  const [newLevelRoleRoleId, setNewLevelRoleRoleId] = useState("")

  // Données Embed Builder
  const [embedForm, setEmbedForm] = useState({
    channelId: "",
    title: "📢 Annonce Importante",
    description: "Bienvenue sur le serveur Discord ! N'hésitez pas à consulter les salons d'informations.",
    color: "#6366F1",
    image: "",
    thumbnail: "",
    footer: "God_Sparky • Modération & Événements"
  })
  const [sendingEmbed, setSendingEmbed] = useState(false)

  // Données Warns & Modération Web
  const [warnsList, setWarnsList] = useState([])
  const [warnsLoading, setWarnsLoading] = useState(false)

  // Données Tickets
  const [ticketData, setTicketData] = useState({ settings: null, openTickets: [] })
  const [ticketLoading, setTicketLoading] = useState(false)
  const [ticketPanelChannelId, setTicketPanelChannelId] = useState("")
  const [ticketTypesStr, setTicketTypesStr] = useState("suggestion, partenariats, problème, autre")
  const [ticketPanelTitle, setTicketPanelTitle] = useState("🎫 Système de Ticket")
  const [ticketPanelDesc, setTicketPanelDesc] = useState("Si tu as besoin d'aide ouvre un ticket correspondant à ta demande")
  const [sendingTicketPanel, setSendingTicketPanel] = useState(false)

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

        // Initialiser le salon par défaut de l'embed et des tickets
        const firstTextCh = payload?.channels?.find(c => c.type === 0 || c.type === 5)
        if (firstTextCh) {
          setEmbedForm(prev => ({ ...prev, channelId: firstTextCh.id }))
        }
        const ticketChannel = payload?.channels?.find(c => (c.type === 0 || c.type === 5) && c.name?.toLowerCase().includes("ticket"))
        if (ticketChannel) {
          setTicketPanelChannelId(ticketChannel.id)
        } else if (firstTextCh) {
          setTicketPanelChannelId(firstTextCh.id)
        }

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

  // Chargements spécifiques selon l'onglet
  useEffect(() => {
    if (activeTab === "economy" && id && token) {
      fetchShop()
      fetchEconomyLeaderboard()
    } else if (activeTab === "leveling" && id && token) {
      fetchLevels()
    } else if (activeTab === "warns" && id && token) {
      fetchWarns()
    } else if (activeTab === "tickets" && id && token) {
      fetchTickets()
    }
  }, [activeTab, id, token])

  async function fetchShop() {
    setShopLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/shop`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setShopItems(payload?.items || [])
      }
    } catch {
      // Ignorer
    } finally {
      setShopLoading(false)
    }
  }

  async function fetchEconomyLeaderboard() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/economy`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setEconomyLeaderboard(payload?.leaderboard || [])
      }
    } catch {
      // Ignorer
    }
  }

  async function fetchLevels() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/levels`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setXpLeaderboard(payload?.leaderboard || [])
      }
    } catch {
      // Ignorer
    }
  }

  async function fetchWarns() {
    setWarnsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/moderation/warns`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setWarnsList(payload?.warns || [])
      }
    } catch {
      // Ignorer
    } finally {
      setWarnsLoading(false)
    }
  }

  async function handleRevokeWarn(userId) {
    if (!confirm("Voulez-vous révoquer 1 avertissement pour cet utilisateur ?")) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/moderation/warns/${userId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchWarns()
        setSaveMessage({ type: "success", text: "Avertissement révoqué avec succès !" })
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (e) {
      alert("Erreur: " + e.message)
    }
  }

  async function fetchTickets() {
    setTicketLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setTicketData(payload)
        if (payload?.settings) {
          const s = payload.settings
          setConfig(prev => ({
            ...prev,
            ticketEnabled: true,
            ticketCategoryId: s.ticketCategoryId || prev?.ticketCategoryId,
            ticketSupportRoleId: s.supportRoleId || prev?.ticketSupportRoleId,
            ticketLogChannelId: s.logChannelId || prev?.ticketLogChannelId,
          }))
          if (Array.isArray(s.ticketTypes) && s.ticketTypes.length > 0) {
            setTicketTypesStr(s.ticketTypes.join(", "))
          }
        }
      }
    } catch {
      // Ignorer
    } finally {
      setTicketLoading(false)
    }
  }

  async function handleSendTicketPanel() {
    if (!ticketPanelChannelId) {
      alert("Veuillez sélectionner le salon où envoyer le panneau.")
      return
    }

    setSendingTicketPanel(true)
    try {
      const parsedTypes = ticketTypesStr
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)

      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/tickets/send-panel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          channelId: ticketPanelChannelId,
          title: ticketPanelTitle,
          description: ticketPanelDesc,
          supportRoleId: config?.ticketSupportRoleId,
          ticketCategoryId: config?.ticketCategoryId,
          logChannelId: config?.ticketLogChannelId,
          types: parsedTypes.length > 0 ? parsedTypes : ["suggestion", "partenariats", "problème", "autre"]
        })
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Échec de l'envoi du panneau sur Discord")
      }

      setSaveMessage({ type: "success", text: "Panneau de tickets déployé sur Discord !" })
      setTimeout(() => setSaveMessage(null), 4000)
      fetchTickets()
    } catch (e) {
      alert(e.message)
    } finally {
      setSendingTicketPanel(false)
    }
  }

  async function handleCloseTicket(channelId) {
    if (!confirm("Voulez-vous vraiment fermer et supprimer ce salon de ticket ?")) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/tickets/${channelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchTickets()
      }
    } catch (e) {
      alert("Erreur: " + e.message)
    }
  }

  async function handleSendEmbed() {
    if (!embedForm.channelId || !embedForm.description) {
      alert("Veuillez sélectionner un salon et saisir une description.")
      return
    }

    setSendingEmbed(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/embed`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(embedForm)
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Échec de l'envoi de l'embed")
      }

      setSaveMessage({ type: "success", text: "Embed envoyé avec succès sur Discord !" })
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (e) {
      alert(e.message)
    } finally {
      setSendingEmbed(false)
    }
  }

  // Détection des modifications de configuration
  const hasChanges = useMemo(() => {
    if (!config) return false
    return JSON.stringify(config) !== savedConfigStr
  }, [config, savedConfigStr])

  // Séparation des channels
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

  const categoryChannels = useMemo(() => {
    const raw = data?.channels || []
    return raw
      .filter(ch => ch.type === 4)
      .map(ch => ({ id: ch.id, name: ch.name || ch.id, prefix: "📁" }))
  }, [data?.channels])

  const roles = useMemo(() => {
    return data?.roles || []
  }, [data?.roles])

  function updateField(key, val) {
    setConfig(prev => ({
      ...prev,
      [key]: val
    }))
    setSaveMessage(null)
  }

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

  function removeBadWord(wordToRemove) {
    const currentWords = Array.isArray(config?.badWords) ? config.badWords : []
    updateField(
      "badWords",
      currentWords.filter(w => w !== wordToRemove)
    )
  }

  function addLevelRole() {
    if (!newLevelRoleRoleId || !newLevelRoleLevel) return
    const current = Array.isArray(config?.levelRoles) ? config.levelRoles : []
    if (current.some(r => Number(r.level) === Number(newLevelRoleLevel))) return

    updateField("levelRoles", [
      ...current,
      { level: Number(newLevelRoleLevel), roleId: newLevelRoleRoleId }
    ].sort((a, b) => a.level - b.level))
    setNewLevelRoleRoleId("")
  }

  function removeLevelRole(lvl) {
    const current = Array.isArray(config?.levelRoles) ? config.levelRoles : []
    updateField("levelRoles", current.filter(r => Number(r.level) !== Number(lvl)))
  }

  function handleReset() {
    try {
      setConfig(JSON.parse(savedConfigStr))
      setSaveMessage(null)
    } catch {
      // Ignorer
    }
  }

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

  async function handleSaveShopItem() {
    if (!itemForm.name || itemForm.price < 0) return

    try {
      const url = editingItem
        ? `${API_BASE_URL}/api/guilds/${id}/shop/${editingItem.itemId}`
        : `${API_BASE_URL}/api/guilds/${id}/shop`
      const method = editingItem ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(itemForm)
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Erreur lors de la sauvegarde de l'article")
      }

      setShowShopModal(false)
      setEditingItem(null)
      setItemForm({ name: "", description: "", price: 100, stock: -1, type: "role", roleId: "" })
      fetchShop()
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleDeleteShopItem(itemId) {
    if (!confirm("Voulez-vous vraiment supprimer cet article de la boutique ?")) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/shop/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchShop()
      }
    } catch (e) {
      alert("Erreur: " + e.message)
    }
  }

  async function handleAdjustBalance() {
    if (!balanceModalUser || adjustAmount <= 0) return

    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/economy/balance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: balanceModalUser.userId,
          amount: Number(adjustAmount),
          action: adjustAction
        })
      })

      if (res.ok) {
        setBalanceModalUser(null)
        fetchEconomyLeaderboard()
      }
    } catch (e) {
      alert("Erreur: " + e.message)
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
            <LanguageSelector />
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-rose-300"
            >
              {t("common.logout")}
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

            {/* Menu d'onglets de configuration complet */}
            {botInGuild && (
              <>
                <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                  <TabButton active={activeTab === "channels"} onClick={() => setActiveTab("channels")} icon="📌" label={t("tabs.channels")} />
                  <TabButton active={activeTab === "security"} onClick={() => setActiveTab("security")} icon="🛡️" label={t("tabs.security")} />
                  <TabButton active={activeTab === "economy"} onClick={() => setActiveTab("economy")} icon="🪙" label={config?.economyEnabled === false ? `${t("tabs.economy")} (${t("common.disabled")})` : t("tabs.economy")} />
                  <TabButton active={activeTab === "leveling"} onClick={() => setActiveTab("leveling")} icon="🏆" label={config?.xpEnabled === false ? `${t("tabs.leveling")} (${t("common.disabled")})` : t("tabs.leveling")} />
                  <TabButton active={activeTab === "tickets"} onClick={() => setActiveTab("tickets")} icon="🎫" label={t("tabs.tickets")} />
                  <TabButton active={activeTab === "embeds"} onClick={() => setActiveTab("embeds")} icon="📢" label={t("tabs.embeds")} />
                  <TabButton active={activeTab === "warns"} onClick={() => setActiveTab("warns")} icon="📜" label={t("tabs.warns")} />
                  <TabButton active={activeTab === "words"} onClick={() => setActiveTab("words")} icon="🚫" label={`${t("tabs.words")} (${config?.badWords?.length || 0})`} />
                  <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon="⚙️" label={t("tabs.settings")} />
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

                        <SelectField
                          label="Salon d'Annonces & Mises à Jour du Bot"
                          description="Où recevoir automatiquement les annonces de nouveautés et mises à jour majeures de God_Sparky."
                          value={config?.announcementChannel}
                          onChange={val => updateField("announcementChannel", val)}
                          options={[{ id: "", name: "Détection automatique intelligente (recommandé)" }, ...textChannels]}
                          placeholder="Détection automatique"
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
                        description="Supprime automatiquement les liens d'invitation Discord et URLs non autorisées publiées par les membres."
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

                {/* Section 3 : Économie & Boutique (Shop) */}
                {activeTab === "economy" && (
                  <div className="space-y-8">
                    {/* Activation du module */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-white">Système d'Économie & Récompenses</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Configurez la monnaie virtuelle, les gains et la boutique de votre communauté.
                          </p>
                        </div>
                        <div>
                          {config?.economyEnabled === false ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
                              <span className="h-2 w-2 rounded-full bg-rose-400" />
                              Désactivé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              Actif
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <Toggle
                          label="Activer le système d'économie sur ce serveur"
                          description="Permet aux membres d'utiliser les commandes d'argent (/money, /daily, /work, /coinflip, /pay), la boutique (/shop) et les récompenses de chat."
                          checked={config?.economyEnabled !== false}
                          onChange={v => updateField("economyEnabled", v)}
                        />
                      </div>

                      {config?.economyEnabled === false && (
                        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                          ⚠️ <strong>Économie désactivée</strong> : les membres ne peuvent pas gagner d'argent, transférer de fonds ou faire des achats sur Discord. Vous pouvez continuer à ajuster les paramètres ci-dessous en préparation.
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Configuration de la Monnaie & des Gains</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Personnalisez le nom, le symbole et les montants accordés aux membres.
                      </p>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-xs font-semibold text-slate-300">Symbole de la monnaie</label>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={config?.currencySymbol ?? "$"}
                              maxLength={6}
                              onChange={e => updateField("currencySymbol", e.target.value)}
                              className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-center text-lg font-bold text-white outline-none focus:border-indigo-500"
                            />
                            <div className="flex flex-wrap gap-1">
                              {["🪙", "💎", "⚡", "$", "€"].map(sym => (
                                <button
                                  key={sym}
                                  type="button"
                                  onClick={() => updateField("currencySymbol", sym)}
                                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                                >
                                  {sym}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-xs font-semibold text-slate-300">Nom de la monnaie</label>
                          <input
                            type="text"
                            value={config?.currencyName ?? "Coins"}
                            onChange={e => updateField("currencyName", e.target.value)}
                            placeholder="Ex: Sparks, Pièces..."
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-xs font-semibold text-slate-300">Récompense journalière (/daily)</label>
                          <input
                            type="number"
                            min={0}
                            value={config?.dailyAmount ?? 500}
                            onChange={e => updateField("dailyAmount", Number(e.target.value))}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-xs font-semibold text-slate-300">Salaire minimum (/work)</label>
                          <input
                            type="number"
                            min={0}
                            value={config?.workMin ?? 50}
                            onChange={e => updateField("workMin", Number(e.target.value))}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-xs font-semibold text-slate-300">Salaire maximum (/work)</label>
                          <input
                            type="number"
                            min={0}
                            value={config?.workMax ?? 250}
                            onChange={e => updateField("workMax", Number(e.target.value))}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-xs font-semibold text-slate-300">Gain par message chat (Chat-to-Earn)</label>
                          <input
                            type="number"
                            min={0}
                            value={config?.chatReward ?? 0}
                            onChange={e => updateField("chatReward", Number(e.target.value))}
                            placeholder="0 pour désactiver"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Toggle
                          label="Autoriser les vols d'argent (/rob)"
                          description="Permet aux membres de tenter de voler une partie du solde d'autres membres avec une chance d'amende si pris."
                          checked={Boolean(config?.robEnabled)}
                          onChange={v => updateField("robEnabled", v)}
                        />
                      </div>
                    </div>

                    {/* Gestionnaire de Boutique (Shop Manager) */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white">Articles de la Boutique (/shop)</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Proposez des rôles exclusifs ou des objets virtuels achetables avec l'argent du serveur.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(null)
                            setItemForm({ name: "", description: "", price: 200, stock: -1, type: "role", roleId: roles[0]?.id || "" })
                            setShowShopModal(true)
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
                        >
                          + Ajouter un article
                        </button>
                      </div>

                      {shopLoading ? (
                        <div className="mt-6 h-32 animate-pulse rounded-2xl bg-slate-950/40" />
                      ) : shopItems.length > 0 ? (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {shopItems.map(item => (
                            <div
                              key={item.itemId || item._id}
                              className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950/60 p-5 transition hover:border-white/15"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-bold text-white">{item.name}</h3>
                                  <span className="rounded-lg bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                                    {item.price} {config?.currencySymbol || "$"}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                  {item.description || "Aucune description"}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-white/5">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>Type : <strong className="text-slate-300">{item.type === "role" ? "🎭 Rôle Discord" : "📦 Objet"}</strong></span>
                                  <span>Stock : <strong className="text-slate-300">{item.stock === -1 ? "Illimité" : item.stock}</strong></span>
                                </div>

                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingItem(item)
                                      setItemForm({
                                        name: item.name,
                                        description: item.description,
                                        price: item.price,
                                        stock: item.stock,
                                        type: item.type,
                                        roleId: item.roleId || ""
                                      })
                                      setShowShopModal(true)
                                    }}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShopItem(item.itemId)}
                                    className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                          <p className="text-sm text-slate-400">La boutique est vide pour l'instant.</p>
                          <p className="mt-1 text-xs text-slate-500">Ajoutez un rôle ou un article pour inciter vos membres à être actifs !</p>
                        </div>
                      )}
                    </div>

                    {/* Classement Économie */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Classement des Membres les Plus Riches</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Top des utilisateurs selon leur solde ({config?.currencyName || "Coins"}).
                      </p>

                      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
                            <tr>
                              <th className="px-4 py-3">Rang</th>
                              <th className="px-4 py-3">Membre</th>
                              <th className="px-4 py-3">Solde</th>
                              <th className="px-4 py-3 text-right">Actions Admin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {economyLeaderboard.map(user => (
                              <tr key={user.userId} className="hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-bold text-white">
                                  {user.rank === 1 ? "🥇 #1" : user.rank === 2 ? "🥈 #2" : user.rank === 3 ? "🥉 #3" : `#${user.rank}`}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {user.avatarUrl ? (
                                      <img src={user.avatarUrl} alt={user.username} className="h-7 w-7 rounded-full object-cover" />
                                    ) : (
                                      <div className="h-7 w-7 rounded-full bg-indigo-600/20 text-center font-bold text-xs leading-7 text-indigo-300">?</div>
                                    )}
                                    <span className="font-semibold text-white">{user.username}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                                  {user.balance.toLocaleString()} {config?.currencySymbol || "$"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBalanceModalUser(user)
                                      setAdjustAmount(500)
                                      setAdjustAction("add")
                                    }}
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                                  >
                                    ⚙️ Gérer solde
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {economyLeaderboard.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                  Aucun utilisateur n'a encore de compte d'économie sur ce serveur.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4 : Niveaux & XP */}
                {activeTab === "leveling" && (
                  <div className="space-y-8">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-white">Système d'Expérience & Niveaux</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Récompensez l'activité des membres sur votre serveur Discord.
                          </p>
                        </div>
                        <div>
                          {config?.xpEnabled === false ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
                              <span className="h-2 w-2 rounded-full bg-rose-400" />
                              Désactivé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              Actif
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <Toggle
                          label="Activer le système de niveaux et d'XP"
                          description="Les membres reçoivent de l'expérience aléatoire (15 à 30 XP) à chaque message envoyé avec un délai d'une minute."
                          checked={config?.xpEnabled !== false}
                          onChange={v => updateField("xpEnabled", v)}
                        />

                        <SelectField
                          label="Salon d'annonce des passages de niveau"
                          description="Où envoyer le message de félicitations lors d'un level up."
                          value={config?.xpChannelId}
                          onChange={val => updateField("xpChannelId", val)}
                          options={[
                            { id: "", name: "Dans le salon où le message a été envoyé (défaut)" },
                            { id: "none", name: "Désactiver les annonces (silencieux)" },
                            ...textChannels
                          ]}
                          placeholder="Même salon que le message"
                        />
                      </div>
                    </div>

                    {/* Rôles de Récompenses (Level Rewards) */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Rôles de Paliers (Level Rewards)</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Attribuez automatiquement des rôles Discord lorsqu'un membre atteint un niveau spécifique.
                      </p>

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="w-full sm:w-36">
                          <label className="text-xs font-semibold text-slate-400">Niveau requis</label>
                          <input
                            type="number"
                            min={1}
                            value={newLevelRoleLevel}
                            onChange={e => setNewLevelRoleLevel(Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="text-xs font-semibold text-slate-400">Rôle attribué</label>
                          <select
                            value={newLevelRoleRoleId}
                            onChange={e => setNewLevelRoleRoleId(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          >
                            <option value="">Sélectionner un rôle...</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:self-end">
                          <button
                            type="button"
                            onClick={addLevelRole}
                            disabled={!newLevelRoleRoleId}
                            className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                          >
                            + Lier le rôle
                          </button>
                        </div>
                      </div>

                      <div className="mt-6">
                        {Array.isArray(config?.levelRoles) && config.levelRoles.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {config.levelRoles.map(lr => {
                              const roleObj = roles.find(r => r.id === lr.roleId)
                              return (
                                <div
                                  key={lr.level}
                                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/60 p-4"
                                >
                                  <div>
                                    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                                      Niveau {lr.level}
                                    </span>
                                    <p className="mt-2 font-semibold text-white">
                                      {roleObj?.name || `Rôle ID: ${lr.roleId}`}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeLevelRole(lr.level)}
                                    className="text-slate-400 hover:text-rose-400"
                                    title="Supprimer ce palier"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-400">
                            Aucun palier de niveau configuré pour l'instant.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Classement XP */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Classement d'Expérience des Membres</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Top des utilisateurs ayant accumulé le plus d'XP.
                      </p>

                      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
                            <tr>
                              <th className="px-4 py-3">Rang</th>
                              <th className="px-4 py-3">Membre</th>
                              <th className="px-4 py-3">Niveau</th>
                              <th className="px-4 py-3">XP Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {xpLeaderboard.map(u => (
                              <tr key={u.userId} className="hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-bold text-white">
                                  {u.rank === 1 ? "🥇 #1" : u.rank === 2 ? "🥈 #2" : u.rank === 3 ? "🥉 #3" : `#${u.rank}`}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {u.avatarUrl ? (
                                      <img src={u.avatarUrl} alt={u.username} className="h-7 w-7 rounded-full object-cover" />
                                    ) : (
                                      <div className="h-7 w-7 rounded-full bg-indigo-600/20 text-center font-bold text-xs leading-7 text-indigo-300">?</div>
                                    )}
                                    <span className="font-semibold text-white">{u.username}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-lg bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                                    Niveau {u.level}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-200">
                                  {u.xp.toLocaleString()} XP
                                </td>
                              </tr>
                            ))}
                            {xpLeaderboard.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                  Aucun niveau enregistré pour le moment.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 5 : Tickets Support */}
                {activeTab === "tickets" && (
                  <div className="space-y-8">
                    {/* Statut & Paramètres */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white">Système de Tickets d'Assistance</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Permet aux membres d'ouvrir des salons privés d'assistance avec l'équipe du serveur.
                          </p>
                        </div>
                        {ticketData?.settings ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Système configuré & actif
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                            En attente de configuration
                          </span>
                        )}
                      </div>

                      <div className="mt-6 space-y-4">
                        <Toggle
                          label="Activer le système de tickets"
                          description="Active la gestion automatique des tickets pour votre serveur."
                          checked={Boolean(config?.ticketEnabled)}
                          onChange={v => updateField("ticketEnabled", v)}
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                          <SelectField
                            label="Catégorie Discord des tickets"
                            description="Catégorie sous laquelle les salons de tickets seront créés."
                            value={config?.ticketCategoryId}
                            onChange={val => updateField("ticketCategoryId", val)}
                            options={categoryChannels}
                            placeholder="Sélectionner une catégorie"
                          />

                          <SelectField
                            label="Rôle du Support"
                            description="Rôle Discord qui aura la permission de voir et répondre dans les tickets."
                            value={config?.ticketSupportRoleId}
                            onChange={val => updateField("ticketSupportRoleId", val)}
                            options={roles}
                            placeholder="Sélectionner un rôle"
                          />

                          <SelectField
                            label="Salon des Logs de tickets"
                            description="Salon où les événements et fermetures de tickets seront notifiés."
                            value={config?.ticketLogChannelId}
                            onChange={val => updateField("ticketLogChannelId", val)}
                            options={textChannels}
                            placeholder="Sélectionner un salon de logs"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-sm font-semibold text-slate-100">Types / Catégories de Tickets (séparés par des virgules)</label>
                          <p className="mt-1 text-xs text-slate-400">
                            Ces options apparaîtront dans le menu déroulant du panneau Discord (ex: suggestion, partenariats, problème, autre).
                          </p>
                          <input
                            type="text"
                            value={ticketTypesStr}
                            onChange={e => setTicketTypesStr(e.target.value)}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Déploiement / Renvoyer le panneau sur Discord */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Déployer le Panneau Interactif sur Discord</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Envoyez le message d'ouverture de ticket avec son menu déroulant dans le salon de votre choix.
                      </p>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-300">Salon Discord où envoyer le panneau</label>
                            <select
                              value={ticketPanelChannelId}
                              onChange={e => setTicketPanelChannelId(e.target.value)}
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            >
                              <option value="">Sélectionner un salon textuel...</option>
                              {textChannels.map(ch => (
                                <option key={ch.id} value={ch.id}>
                                  # {ch.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300">Titre du panneau</label>
                            <input
                              type="text"
                              value={ticketPanelTitle}
                              onChange={e => setTicketPanelTitle(e.target.value)}
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300">Description du panneau</label>
                            <textarea
                              rows={2}
                              value={ticketPanelDesc}
                              onChange={e => setTicketPanelDesc(e.target.value)}
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleSendTicketPanel}
                            disabled={sendingTicketPanel || !ticketPanelChannelId}
                            className="w-full rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
                          >
                            {sendingTicketPanel ? "Déploiement en cours..." : "🚀 Envoyer / Renvoyer le Panneau sur Discord"}
                          </button>
                        </div>

                        {/* Prévisualisation */}
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Aperçu du Panneau Discord
                          </label>
                          <div className="mt-2 rounded-2xl border border-white/10 bg-[#2b2d31] p-4 text-[#dbdee1] shadow-xl">
                            <div className="flex items-center gap-3">
                              {bot?.avatarUrl ? (
                                <img src={bot.avatarUrl} alt="Bot" className="h-9 w-9 rounded-full" />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-indigo-600 grid place-items-center font-bold text-white">G</div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white">{bot?.username || "God_Sparky"}</span>
                                  <span className="rounded bg-[#5865f2] px-1 py-0.2 text-[10px] font-bold text-white">BOT</span>
                                </div>
                                <span className="text-[10px] text-[#949ba4]">Aujourd'hui à {new Date().toLocaleTimeString().slice(0, 5)}</span>
                              </div>
                            </div>

                            <div className="mt-3 rounded-lg border-l-4 border-[#0099ff] bg-[#2b2d31] p-3 text-xs">
                              <h4 className="font-bold text-white">{ticketPanelTitle}</h4>
                              <p className="mt-1 text-slate-300">{ticketPanelDesc}</p>
                              <div className="mt-2 text-[10px] text-[#949ba4]">God_Sparky • Support & Assistance</div>
                            </div>

                            <div className="mt-3">
                              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1e1f22] p-2.5 text-xs text-slate-400">
                                <span>Sélectionnez le type de ticket</span>
                                <span>▼</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Salons de Tickets Ouverts en Direct */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white">Tickets Actuellement Ouverts ({ticketData?.openTickets?.length || 0})</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Salons privés créés par les membres sous la catégorie configurée.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={fetchTickets}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                        >
                          Rafraîchir
                        </button>
                      </div>

                      <div className="mt-6">
                        {ticketData?.openTickets && ticketData.openTickets.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {ticketData.openTickets.map(t => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/60 p-4 transition hover:border-white/15"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">#</span>
                                    <span className="font-semibold text-white">{t.name}</span>
                                  </div>
                                  <p className="mt-1 text-[11px] font-mono text-slate-500">ID: {t.id}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCloseTicket(t.id)}
                                  className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                                >
                                  Fermer
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400">
                            Aucun ticket ouvert actuellement.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 6 : Constructeur d'Embeds (Embed Builder) */}
                {activeTab === "embeds" && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">Constructeur d'Annonces & d'Embeds Visuels</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Composez un message riche avec prévisualisation Discord en direct et envoyez-le instantanément via God_Sparky.
                      </p>

                      <div className="mt-6 grid gap-8 lg:grid-cols-2">
                        {/* Formulaire à gauche */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-300">Salon Discord de destination</label>
                            <select
                              value={embedForm.channelId}
                              onChange={e => setEmbedForm({ ...embedForm, channelId: e.target.value })}
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            >
                              {textChannels.map(ch => (
                                <option key={ch.id} value={ch.id}>
                                  # {ch.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300">Titre de l'embed</label>
                            <input
                              type="text"
                              value={embedForm.title}
                              onChange={e => setEmbedForm({ ...embedForm, title: e.target.value })}
                              placeholder="Titre..."
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300">Description (Supporte Markdown)</label>
                            <textarea
                              rows={5}
                              value={embedForm.description}
                              onChange={e => setEmbedForm({ ...embedForm, description: e.target.value })}
                              placeholder="Texte de l'annonce..."
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300">Couleur de l'embed</label>
                            <div className="mt-1 flex items-center gap-3">
                              <input
                                type="color"
                                value={embedForm.color}
                                onChange={e => setEmbedForm({ ...embedForm, color: e.target.value })}
                                className="h-10 w-14 cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-1"
                              />
                              <div className="flex flex-wrap gap-1">
                                {["#6366F1", "#10B981", "#EF4444", "#F59E0B", "#EC4899", "#3B82F6"].map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEmbedForm({ ...embedForm, color: c })}
                                    style={{ backgroundColor: c }}
                                    className="h-6 w-6 rounded-lg ring-1 ring-white/20 transition hover:scale-110"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-300">URL Image (Bannière)</label>
                              <input
                                type="url"
                                value={embedForm.image}
                                onChange={e => setEmbedForm({ ...embedForm, image: e.target.value })}
                                placeholder="https://..."
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-300">URL Miniature (Thumbnail)</label>
                              <input
                                type="url"
                                value={embedForm.thumbnail}
                                onChange={e => setEmbedForm({ ...embedForm, thumbnail: e.target.value })}
                                placeholder="https://..."
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-300">Pied de page (Footer)</label>
                            <input
                              type="text"
                              value={embedForm.footer}
                              onChange={e => setEmbedForm({ ...embedForm, footer: e.target.value })}
                              placeholder="Texte du bas..."
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleSendEmbed}
                              disabled={sendingEmbed}
                              className="w-full rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
                            >
                              {sendingEmbed ? "Envoi en cours sur Discord..." : "🚀 Envoyer l'annonce sur Discord"}
                            </button>
                          </div>
                        </div>

                        {/* Prévisualisation en direct à droite */}
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Prévisualisation Discord en direct
                          </label>

                          <div className="mt-2 rounded-2xl border border-white/10 bg-[#2b2d31] p-4 text-[#dbdee1] shadow-xl">
                            <div className="flex items-center gap-3">
                              {bot?.avatarUrl ? (
                                <img src={bot.avatarUrl} alt="Bot" className="h-10 w-10 rounded-full" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-indigo-600 grid place-items-center font-bold text-white">G</div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white">{bot?.username || "God_Sparky"}</span>
                                  <span className="rounded bg-[#5865f2] px-1 py-0.2 text-[10px] font-bold text-white">BOT</span>
                                </div>
                                <span className="text-[11px] text-[#949ba4]">Aujourd'hui à {new Date().toLocaleTimeString().slice(0, 5)}</span>
                              </div>
                            </div>

                            {/* Embed Card */}
                            <div
                              className="mt-3 flex overflow-hidden rounded-lg bg-[#2b2d31] border-l-4 p-4"
                              style={{ borderColor: embedForm.color }}
                            >
                              <div className="flex-1 space-y-2">
                                {embedForm.title && (
                                  <h4 className="font-bold text-white leading-tight">{embedForm.title}</h4>
                                )}
                                <p className="text-xs leading-relaxed whitespace-pre-wrap text-[#dbdee1]">
                                  {embedForm.description || "Tapez du texte à gauche pour voir la prévisualisation..."}
                                </p>
                                {embedForm.image && (
                                  <img src={embedForm.image} alt="Bannière" className="mt-3 max-h-48 w-full rounded-lg object-cover" />
                                )}
                                {embedForm.footer && (
                                  <div className="mt-3 text-[10px] text-[#949ba4] border-t border-white/5 pt-2">
                                    {embedForm.footer}
                                  </div>
                                )}
                              </div>

                              {embedForm.thumbnail && (
                                <img src={embedForm.thumbnail} alt="Thumbnail" className="ml-4 h-16 w-16 rounded-lg object-cover" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 7 : Sanctions & Modération Web */}
                {activeTab === "warns" && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-white">Historique des Sanctions & Avertissements (Warns)</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Gérez en direct les sanctions appliquées par God_Sparky ou l'équipe de modération.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={fetchWarns}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                      >
                        Rafraîchir
                      </button>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Membre Sanctionné</th>
                            <th className="px-4 py-3">Avertissements Actifs</th>
                            <th className="px-4 py-3">Motifs récents</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {warnsList.map(w => (
                            <tr key={w.userId} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {w.avatarUrl ? (
                                    <img src={w.avatarUrl} alt={w.username} className="h-7 w-7 rounded-full object-cover" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-rose-600/20 text-center font-bold text-xs leading-7 text-rose-300">!</div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-white">{w.username}</p>
                                    <p className="text-[11px] font-mono text-slate-500">ID: {w.userId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                                  {w.warnCount} avertissement(s)
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {w.reasons.slice(-3).map((r, i) => (
                                    <span key={i} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRevokeWarn(w.userId)}
                                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                                >
                                  - Révoquer 1 warn
                                </button>
                              </td>
                            </tr>
                          ))}
                          {warnsList.length === 0 && !warnsLoading && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                ✨ Aucun avertissement actif sur ce serveur. Tout est calme !
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section 8 : Mots Interdits */}
                {activeTab === "words" && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                    <h2 className="text-lg font-bold text-white">Liste des Mots Interdits</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Les messages contenant ces termes seront automatiquement supprimés si le filtre Anti-Insultes est activé.
                    </p>

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

                {/* Section 9 : Langue & Général */}
                {activeTab === "settings" && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                    <h2 className="text-lg font-bold text-white">{t("gen.title")}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {t("gen.desc")}
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
                            onClick={() => {
                              updateField("language", lang.code)
                              setLang(lang.code)
                            }}
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
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
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

      {/* MODAL CRÉATION / ÉDITION ARTICLE BOUTIQUE */}
      {showShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {editingItem ? "Modifier l'article" : "Ajouter un article à la boutique"}
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nom de l'article</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Ex: Rôle VIP, Épée Légendaire..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                  rows={2}
                  placeholder="Avantages de cet article..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Prix ({config?.currencySymbol || "$"})</label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.price}
                    onChange={e => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Stock (-1 = Illimité)</label>
                  <input
                    type="number"
                    min={-1}
                    value={itemForm.stock}
                    onChange={e => setItemForm({ ...itemForm, stock: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Type d'article</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, type: "role" })}
                    className={`rounded-xl border p-2.5 text-xs font-bold transition ${
                      itemForm.type === "role"
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    🎭 Rôle Discord
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, type: "item" })}
                    className={`rounded-xl border p-2.5 text-xs font-bold transition ${
                      itemForm.type === "item"
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    📦 Objet Virtuel
                  </button>
                </div>
              </div>

              {itemForm.type === "role" && (
                <div>
                  <label className="text-xs font-semibold text-slate-300">Rôle Discord attribué à l'achat</label>
                  <select
                    value={itemForm.roleId || ""}
                    onChange={e => setItemForm({ ...itemForm, roleId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">Sélectionnez un rôle...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowShopModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveShopItem}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Enregistrer l'article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTEMENT DU SOLDE ADMIN */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Gérer le solde de {balanceModalUser.username}</h3>
            <p className="mt-1 text-xs text-slate-400">
              Solde actuel : <strong className="text-emerald-400 font-mono">{balanceModalUser.balance} {config?.currencySymbol || "$"}</strong>
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Action</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {[
                    { id: "add", label: "+ Ajouter" },
                    { id: "remove", label: "- Retirer" },
                    { id: "set", label: "= Définir" }
                  ].map(act => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setAdjustAction(act.id)}
                      className={`rounded-xl border py-2 text-xs font-bold ${
                        adjustAction === act.id
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-white/10 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Montant ({config?.currencySymbol || "$"})</label>
                <input
                  type="number"
                  min={1}
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAdjustBalance}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Confirmer l'ajustement
              </button>
            </div>
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
