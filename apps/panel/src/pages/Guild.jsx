import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { clearJwt, getJwt } from "../lib/auth"
import { useLanguage, LanguageSelector } from "../lib/i18n"
import MinecraftTab from "../components/MinecraftTab"

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
  const { t, setLang } = useLanguage()
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
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: 100, stock: -1, type: "role", roleId: "", minecraftCommand: "" })

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
    author: "",
    authorIcon: "",
    title: "📢 Annonce Importante",
    description: "Bienvenue sur le serveur Discord ! N'hésitez pas à consulter les salons d'informations.",
    color: "#6366F1",
    fields: [
      { name: "📌 Salons Utiles", value: "Consultez #reglement et #annonces pour rester informé.", inline: true },
      { name: "🛡️ Sécurité & Support", value: "Ouvrez un ticket en cas de question ou de signalement.", inline: true },
      { name: "🎉 Événements & Rôles", value: "Participez aux animations pour grimper dans le classement d'expérience !", inline: false }
    ],
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
  const [_ticketLoading, setTicketLoading] = useState(false)
  const [ticketPanelChannelId, setTicketPanelChannelId] = useState("")
  const [ticketTypesStr, setTicketTypesStr] = useState("suggestion, partenariats, problème, autre")
  const [ticketPanelTitle, setTicketPanelTitle] = useState("🎫 Système de Ticket")
  const [ticketPanelDesc, setTicketPanelDesc] = useState("Si tu as besoin d'aide ouvre un ticket correspondant à ta demande")
  const [sendingTicketPanel, setSendingTicketPanel] = useState(false)

  // Données Giveaways
  const [giveawaysList, setGiveawaysList] = useState([])
  const [giveawaysLoading, setGiveawaysLoading] = useState(false)
  const [gwType, setGwType] = useState("coins")
  const [gwAmount, setGwAmount] = useState("1000")
  const [gwRoleId, setGwRoleId] = useState("")
  const [gwPrize, setGwPrize] = useState("")
  const [gwDuration, setGwDuration] = useState("60")
  const [gwWinners, setGwWinners] = useState("1")
  const [gwChannel, setGwChannel] = useState("")
  const [gwSubmitting, setGwSubmitting] = useState(false)
  const [gwActionLoading, setGwActionLoading] = useState(null)
  const [gwMessage, setGwMessage] = useState(null)

  // Données Statistiques (Module 1)
  const [statsData, setStatsData] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Données Reaction Roles (Module 2)
  const [rrForm, setRrForm] = useState({
    channelId: "",
    title: "🎭 Choix des Rôles",
    description: "Cliquez sur les options ci-dessous pour obtenir ou retirer vos rôles.",
    color: "#6366F1",
    displayType: "buttons",
    roles: []
  })
  const [newRrRole, setNewRrRole] = useState({
    roleId: "",
    label: "",
    emoji: "",
    style: "PRIMARY"
  })
  const [sendingRr, setSendingRr] = useState(false)
  const [rrActionLoading, setRrActionLoading] = useState(null)
  const [rrMessage, setRrMessage] = useState(null)

  // Données Journal d'Audit (Module 3)
  const [auditEvents, setAuditEvents] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFilter, setAuditFilter] = useState("all")
  const [auditSearch, setAuditSearch] = useState("")
  const [auditAutoRefresh, setAuditAutoRefresh] = useState(true)
  const [hasAuditPermission, setHasAuditPermission] = useState(true)

  // Données Auto-Répondeur & Commandes Custom (Module 4)
  const [showCcModal, setShowCcModal] = useState(false)
  const [editingCc, setEditingCc] = useState(null)
  const [ccForm, setCcForm] = useState({
    trigger: "",
    response: "",
    matchType: "exact",
    isEmbed: false,
    embedTitle: "",
    embedColor: "#6366F1",
    enabled: true
  })

  // Données Auto-Sanction personnalisée
  const [newSanctionWarns, setNewSanctionWarns] = useState(3)
  const [newSanctionAction, setNewSanctionAction] = useState("timeout")
  const [newSanctionDuration, setNewSanctionDuration] = useState(10)

  // Données Intégrations (YouTube & Twitch)
  const [ytForm, setYtForm] = useState({
    channelInput: "",
    discordChannelId: "",
    roleId: "",
    customMessage: "🎬 **Nouvelle vidéo de {author} !**\n\n📌 **{title}**\n👉 {url}"
  })
  const [twitchForm, setTwitchForm] = useState({
    streamerLogin: "",
    discordChannelId: "",
    roleId: "",
    customMessage: "🟣 **{streamer} est en LIVE sur Twitch !**\n\n🎮 **{game}** : {title}\n👉 {url}"
  })
  const [addingYt, setAddingYt] = useState(false)
  const [addingTwitch, setAddingTwitch] = useState(false)
  const [deletingIntegrationId, setDeletingIntegrationId] = useState(null)
  const [integrationMsg, setIntegrationMsg] = useState(null)

  // Données Formulaires & Candidatures (Modals)
  const [formBuilder, setFormBuilder] = useState({
    title: "Candidature Recrutement Staff",
    description: "Remplissez ce formulaire pour postuler. Notre équipe traitera votre demande sous 48h.",
    buttonLabel: "Postuler",
    buttonEmoji: "📝",
    buttonStyle: "PRIMARY",
    channelId: "",
    targetChannelId: "",
    roleToGiveOnAccept: "",
    createTicket: false,
    ticketCategoryId: "",
    fields: [
      { id: "q1", label: "Présentation & Âge", placeholder: "Présentez-vous rapidement (prénom, âge, activités)...", style: "paragraph", required: true },
      { id: "q2", label: "Vos motivations & Disponibilités", placeholder: "Pourquoi postuler et quelles sont vos disponibilités ?", style: "paragraph", required: true },
      { id: "q3", label: "Expérience passée", placeholder: "Avez-vous déjà modéré ou géré un serveur / projet ?", style: "paragraph", required: false }
    ]
  })
  const [sendingForm, setSendingForm] = useState(false)
  const [deletingFormId, setDeletingFormId] = useState(null)
  const [formMsg, setFormMsg] = useState(null)
  const [submissionsModal, setSubmissionsModal] = useState(null)

  // Données Question du Jour (QOTD Trivia)
  const [triviaMsg, setTriviaMsg] = useState(null)
  const [triviaTriggering, setTriviaTriggering] = useState(false)
  const [newTriviaQ, setNewTriviaQ] = useState({ question: "", answers: "", hint: "" })
  const [showDefaultTrivia, setShowDefaultTrivia] = useState(false)
  const [defaultTriviaList, setDefaultTriviaList] = useState([])

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

        // Initialiser le salon par défaut de l'embed, des tickets et des reaction roles
        const firstTextCh = payload?.channels?.find(c => c.type === 0 || c.type === 5)
        if (firstTextCh) {
          setEmbedForm(prev => ({ ...prev, channelId: firstTextCh.id }))
          setRrForm(prev => ({ ...prev, channelId: firstTextCh.id }))
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
    } else if (activeTab === "giveaways" && id && token) {
      fetchGiveaways()
    } else if (activeTab === "stats" && id && token) {
      fetchStats()
    } else if (activeTab === "audit" && id && token) {
      fetchAuditLogs()
    } else if (activeTab === "trivia" && id && token && defaultTriviaList.length === 0) {
      fetch(`${API_BASE_URL}/api/guilds/${id}/trivia/default-questions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(payload => {
          if (payload?.questions) setDefaultTriviaList(payload.questions)
        })
        .catch(() => {})
    }
  }, [activeTab, id, token])

  // Actualisation automatique des logs d'audit (toutes les 15s)
  useEffect(() => {
    if (activeTab !== "audit" || !auditAutoRefresh || !id || !token) return
    const timer = setInterval(() => {
      fetchAuditLogs()
    }, 15000)
    return () => clearInterval(timer)
  }, [activeTab, auditAutoRefresh, id, token])

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
    const hasDesc = Boolean(embedForm.description && embedForm.description.trim())
    const hasFields = Array.isArray(embedForm.fields) && embedForm.fields.some(f => f.name?.trim() && f.value?.trim())
    const hasTitle = Boolean(embedForm.title && embedForm.title.trim())
    const hasImage = Boolean(embedForm.image && embedForm.image.trim())

    if (!embedForm.channelId || (!hasDesc && !hasFields && !hasTitle && !hasImage)) {
      alert("Veuillez sélectionner un salon Discord et renseigner au moins un titre, une description ou un champ.")
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

  function handleAddEmbedField() {
    if ((embedForm.fields || []).length >= 25) {
      alert("Discord limite les embeds à 25 champs maximum.")
      return
    }
    setEmbedForm(prev => ({
      ...prev,
      fields: [...(prev.fields || []), { name: "", value: "", inline: false }]
    }))
  }

  function handleUpdateEmbedField(index, key, val) {
    setEmbedForm(prev => {
      const fields = [...(prev.fields || [])]
      fields[index] = { ...fields[index], [key]: val }
      return { ...prev, fields }
    })
  }

  function handleRemoveEmbedField(index) {
    setEmbedForm(prev => ({
      ...prev,
      fields: (prev.fields || []).filter((_, i) => i !== index)
    }))
  }

  function handleMoveEmbedField(index, direction) {
    setEmbedForm(prev => {
      const fields = [...(prev.fields || [])]
      const targetIdx = index + direction
      if (targetIdx < 0 || targetIdx >= fields.length) return prev
      const temp = fields[index]
      fields[index] = fields[targetIdx]
      fields[targetIdx] = temp
      return { ...prev, fields }
    })
  }

  // Fonctions Giveaways
  async function fetchGiveaways() {
    setGiveawaysLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/giveaways`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setGiveawaysList(payload?.giveaways || [])
      }
    } catch (e) {
      console.warn("fetchGiveaways error:", e)
    } finally {
      setGiveawaysLoading(false)
    }
  }

  async function handleCreateGiveaway(e) {
    if (e) e.preventDefault()
    if (!gwChannel) {
      setGwMessage({ type: "error", text: "Veuillez choisir un salon pour le giveaway." })
      return
    }

    let finalPrize = gwPrize.trim()
    let finalAmount = null
    let finalRoleId = null

    if (gwType === "coins") {
      const amt = Number(gwAmount)
      if (!amt || amt <= 0) {
        setGwMessage({ type: "error", text: "Veuillez indiquer un montant de pièces valide supérieur à 0." })
        return
      }
      finalAmount = amt
      if (!finalPrize) {
        finalPrize = `${amt.toLocaleString()} ${config?.currencySymbol || "$"}`
      }
    } else if (gwType === "xp") {
      const amt = Number(gwAmount)
      if (!amt || amt <= 0) {
        setGwMessage({ type: "error", text: "Veuillez indiquer un montant d'XP valide supérieur à 0." })
        return
      }
      finalAmount = amt
      if (!finalPrize) {
        finalPrize = `${amt.toLocaleString()} XP`
      }
    } else if (gwType === "role") {
      if (!gwRoleId) {
        setGwMessage({ type: "error", text: "Veuillez sélectionner un rôle Discord à attribuer." })
        return
      }
      finalRoleId = gwRoleId
      if (!finalPrize) {
        const foundRole = roles.find((r) => r.id === gwRoleId)
        finalPrize = `Rôle @${foundRole?.name || "Membre"}`
      }
    } else {
      if (!finalPrize) {
        setGwMessage({ type: "error", text: "Veuillez renseigner un intitulé pour le lot." })
        return
      }
    }

    setGwSubmitting(true)
    setGwMessage(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/giveaways`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prize: finalPrize,
          rewardType: gwType,
          rewardAmount: finalAmount,
          rewardRoleId: finalRoleId,
          durationMinutes: Number(gwDuration) || 60,
          winnersCount: Number(gwWinners) || 1,
          channelId: gwChannel
        })
      })
      const payload = await res.json()
      if (res.ok) {
        setGwMessage({ type: "success", text: t("gw.successCreated") })
        setGwPrize("")
        fetchGiveaways()
      } else {
        setGwMessage({ type: "error", text: payload?.error || "Erreur lors de la création du giveaway" })
      }
    } catch (err) {
      setGwMessage({ type: "error", text: err?.message || "Impossible de contacter l'API" })
    } finally {
      setGwSubmitting(false)
    }
  }

  async function handleEndGiveaway(giveawayId) {
    if (!window.confirm(t("gw.confirmEnd"))) return
    setGwActionLoading(giveawayId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/giveaways/${giveawayId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setGwMessage({ type: "success", text: t("gw.successEnded") })
        fetchGiveaways()
      }
    } catch (err) {
      setGwMessage({ type: "error", text: err?.message })
    } finally {
      setGwActionLoading(null)
    }
  }

  async function handleRerollGiveaway(giveawayId) {
    if (!window.confirm(t("gw.confirmReroll"))) return
    setGwActionLoading(giveawayId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/giveaways/${giveawayId}/reroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setGwMessage({ type: "success", text: t("gw.successReroll") })
        fetchGiveaways()
      }
    } catch (err) {
      setGwMessage({ type: "error", text: err?.message })
    } finally {
      setGwActionLoading(null)
    }
  }

  async function handleDeleteGiveaway(giveawayId) {
    if (!window.confirm(t("gw.confirmDelete"))) return
    setGwActionLoading(giveawayId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/giveaways/${giveawayId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchGiveaways()
      }
    } catch (err) {
      setGwMessage({ type: "error", text: err?.message })
    } finally {
      setGwActionLoading(null)
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

  function updateMinecraftField(field, val) {
    setConfig(prev => ({
      ...prev,
      minecraft: {
        ...(prev?.minecraft || {}),
        [field]: val
      }
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
      setItemForm({ name: "", description: "", price: 100, stock: -1, type: "role", roleId: "", minecraftCommand: "" })
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

  // Module 1 : Statistiques
  async function fetchStats() {
    setStatsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setStatsData(payload)
      }
    } catch {
      // Ignorer
    } finally {
      setStatsLoading(false)
    }
  }

  // Module 2 : Reaction Roles
  async function handleSendReactionRole() {
    if (!rrForm.channelId) {
      alert("Veuillez sélectionner un salon Discord pour envoyer le panneau.")
      return
    }
    if (!Array.isArray(rrForm.roles) || rrForm.roles.length === 0) {
      alert("Veuillez ajouter au moins un rôle.")
      return
    }
    setSendingRr(true)
    setRrMessage(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/reaction-roles/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(rrForm)
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || "Erreur lors de l'envoi du panneau")
      setRrMessage({ type: "success", text: t("rr.sentSuccess") })
      if (payload?.panel) {
        setConfig(prev => ({
          ...prev,
          reactionRoles: [...(prev?.reactionRoles || []).filter(p => p.id !== payload.panel.id), payload.panel]
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            parsed.reactionRoles = [...(parsed.reactionRoles || []).filter(p => p.id !== payload.panel.id), payload.panel]
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
      }
    } catch (e) {
      setRrMessage({ type: "error", text: e.message })
    } finally {
      setSendingRr(false)
    }
  }

  async function handleDeleteReactionRole(panelId) {
    if (!window.confirm(t("rr.deleteConfirm"))) return
    setRrActionLoading(panelId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/reaction-roles/${panelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          reactionRoles: (prev?.reactionRoles || []).filter(p => p.id !== panelId)
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            parsed.reactionRoles = (parsed.reactionRoles || []).filter(p => p.id !== panelId)
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
      }
    } catch (e) {
      alert("Erreur suppression: " + e.message)
    } finally {
      setRrActionLoading(null)
    }
  }

  // Module 3 : Journal d'Audit
  async function fetchAuditLogs() {
    setAuditLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setAuditEvents(payload?.events || [])
        setHasAuditPermission(payload?.hasAuditPermission !== false)
      }
    } catch {
      // Ignorer
    } finally {
      setAuditLoading(false)
    }
  }

  // Module 4 : Auto-Répondeur & Commandes Custom
  function handleOpenCcModal(cmd = null) {
    if (cmd) {
      setEditingCc(cmd)
      setCcForm({
        trigger: cmd.trigger || "",
        response: cmd.response || "",
        matchType: cmd.matchType || "exact",
        isEmbed: Boolean(cmd.isEmbed),
        embedTitle: cmd.embedTitle || "",
        embedColor: cmd.embedColor || "#6366F1",
        enabled: cmd.enabled !== false
      })
    } else {
      setEditingCc(null)
      setCcForm({
        trigger: "",
        response: "",
        matchType: "exact",
        isEmbed: false,
        embedTitle: "",
        embedColor: "#6366F1",
        enabled: true
      })
    }
    setShowCcModal(true)
  }

  function handleSaveCustomCommand() {
    if (!ccForm.trigger.trim() || !ccForm.response.trim()) {
      alert("Le déclencheur et la réponse sont obligatoires.")
      return
    }

    const currentList = Array.isArray(config?.customCommands) ? [...config.customCommands] : []
    let updatedList

    if (editingCc) {
      updatedList = currentList.map(c => (c.id === editingCc.id ? { ...c, ...ccForm } : c))
    } else {
      const newCmd = {
        id: `cmd_${Date.now()}`,
        ...ccForm,
        createdAt: new Date().toISOString()
      }
      updatedList = [...currentList, newCmd]
    }

    updateField("customCommands", updatedList)
    setShowCcModal(false)
    setEditingCc(null)
  }

  function handleToggleCustomCommand(cmdId) {
    const currentList = Array.isArray(config?.customCommands) ? [...config.customCommands] : []
    const updatedList = currentList.map(c => (c.id === cmdId ? { ...c, enabled: !c.enabled } : c))
    updateField("customCommands", updatedList)
  }

  function handleDeleteCustomCommand(cmdId) {
    if (!window.confirm(t("cc.deleteConfirm"))) return
    const currentList = Array.isArray(config?.customCommands) ? [...config.customCommands] : []
    const updatedList = currentList.filter(c => c.id !== cmdId)
    updateField("customCommands", updatedList)
  }

  // ==========================================
  // Module Intégrations (YouTube & Twitch)
  // ==========================================
  async function handleAddYouTube(e) {
    if (e) e.preventDefault()
    if (!ytForm.channelInput.trim() || !ytForm.discordChannelId) {
      alert("Veuillez renseigner le lien / @handle de la chaîne et le salon Discord.")
      return
    }
    setAddingYt(true)
    setIntegrationMsg(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/integrations/youtube`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ytForm)
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || "Erreur lors de l'ajout de l'alerte YouTube")
      setIntegrationMsg({ type: "success", text: `Alerte YouTube configurée avec succès pour ${payload?.alert?.channelTitle || "la chaîne"} !` })
      if (payload?.alert) {
        setConfig(prev => ({
          ...prev,
          integrations: {
            ...(prev?.integrations || {}),
            youtube: [...(prev?.integrations?.youtube || []).filter(a => a.channelId !== payload.alert.channelId), payload.alert]
          }
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            if (!parsed.integrations) parsed.integrations = { youtube: [], twitch: [] }
            parsed.integrations.youtube = [...(parsed.integrations.youtube || []).filter(a => a.channelId !== payload.alert.channelId), payload.alert]
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
        setYtForm(prev => ({ ...prev, channelInput: "" }))
      }
    } catch (err) {
      setIntegrationMsg({ type: "error", text: err.message })
    } finally {
      setAddingYt(false)
    }
  }

  async function handleDeleteYouTube(alertId) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette alerte YouTube ?")) return
    setDeletingIntegrationId(alertId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/integrations/youtube/${alertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          integrations: {
            ...(prev?.integrations || {}),
            youtube: (prev?.integrations?.youtube || []).filter(a => a.id !== alertId)
          }
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            if (parsed.integrations?.youtube) {
              parsed.integrations.youtube = parsed.integrations.youtube.filter(a => a.id !== alertId)
            }
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
      }
    } catch (err) {
      alert("Erreur suppression alerte YouTube: " + err.message)
    } finally {
      setDeletingIntegrationId(null)
    }
  }

  async function handleAddTwitch(e) {
    if (e) e.preventDefault()
    if (!twitchForm.streamerLogin.trim() || !twitchForm.discordChannelId) {
      alert("Veuillez renseigner le nom de la chaîne Twitch et le salon Discord.")
      return
    }
    setAddingTwitch(true)
    setIntegrationMsg(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/integrations/twitch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(twitchForm)
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || "Erreur lors de l'ajout de l'alerte Twitch")
      setIntegrationMsg({ type: "success", text: `Alerte Twitch configurée avec succès pour ${payload?.alert?.streamerName || "le streamer"} !` })
      if (payload?.alert) {
        setConfig(prev => ({
          ...prev,
          integrations: {
            ...(prev?.integrations || {}),
            twitch: [...(prev?.integrations?.twitch || []).filter(a => a.streamerLogin !== payload.alert.streamerLogin), payload.alert]
          }
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            if (!parsed.integrations) parsed.integrations = { youtube: [], twitch: [] }
            parsed.integrations.twitch = [...(parsed.integrations.twitch || []).filter(a => a.streamerLogin !== payload.alert.streamerLogin), payload.alert]
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
        setTwitchForm(prev => ({ ...prev, streamerLogin: "" }))
      }
    } catch (err) {
      setIntegrationMsg({ type: "error", text: err.message })
    } finally {
      setAddingTwitch(false)
    }
  }

  async function handleDeleteTwitch(alertId) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette alerte Twitch ?")) return
    setDeletingIntegrationId(alertId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/integrations/twitch/${alertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          integrations: {
            ...(prev?.integrations || {}),
            twitch: (prev?.integrations?.twitch || []).filter(a => a.id !== alertId)
          }
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            if (parsed.integrations?.twitch) {
              parsed.integrations.twitch = parsed.integrations.twitch.filter(a => a.id !== alertId)
            }
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
      }
    } catch (err) {
      alert("Erreur suppression alerte Twitch: " + err.message)
    } finally {
      setDeletingIntegrationId(null)
    }
  }

  // ==========================================
  // Module Formulaires & Candidatures (Modals)
  // ==========================================
  function handleAddFormField() {
    if ((formBuilder.fields || []).length >= 5) {
      alert("Discord limite les fenêtres modales à 5 questions maximum.")
      return
    }
    const idx = (formBuilder.fields || []).length + 1
    const newField = {
      id: `field_${Date.now()}`,
      label: `Question ${idx}`,
      placeholder: "Votre réponse...",
      style: "paragraph",
      required: true
    }
    setFormBuilder(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }))
  }

  function handleRemoveFormField(idxToRemove) {
    setFormBuilder(prev => ({
      ...prev,
      fields: (prev.fields || []).filter((_, i) => i !== idxToRemove)
    }))
  }

  function handleUpdateFormField(index, key, val) {
    setFormBuilder(prev => {
      const copy = [...(prev.fields || [])]
      copy[index] = { ...copy[index], [key]: val }
      return { ...prev, fields: copy }
    })
  }

  async function handleSendForm(e) {
    if (e) e.preventDefault()
    if (!formBuilder.title.trim() || !formBuilder.channelId || !formBuilder.targetChannelId) {
      alert("Titre, Salon de publication et Salon de réception Staff requis.")
      return
    }
    if (!Array.isArray(formBuilder.fields) || formBuilder.fields.length === 0) {
      alert("Veuillez configurer au moins 1 question.")
      return
    }

    setSendingForm(true)
    setFormMsg(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/forms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formBuilder)
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || "Erreur lors de la publication du formulaire.")
      setFormMsg({ type: "success", text: "Formulaire publié avec succès sur Discord !" })
      if (payload?.form) {
        setConfig(prev => ({
          ...prev,
          forms: [...(prev?.forms || []).filter(f => f.id !== payload.form.id), payload.form]
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            parsed.forms = [...(parsed.forms || []).filter(f => f.id !== payload.form.id), payload.form]
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
      }
    } catch (err) {
      setFormMsg({ type: "error", text: err.message })
    } finally {
      setSendingForm(false)
    }
  }

  async function handleDeleteForm(formId) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce formulaire ? Le message d'accroche sur Discord sera également supprimé.")) return
    setDeletingFormId(formId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/forms/${formId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          forms: (prev?.forms || []).filter(f => f.id !== formId)
        }))
        setSavedConfigStr(prev => {
          try {
            const parsed = JSON.parse(prev || "{}")
            if (Array.isArray(parsed.forms)) {
              parsed.forms = parsed.forms.filter(f => f.id !== formId)
            }
            return JSON.stringify(parsed)
          } catch {
            return prev
          }
        })
      }
    } catch (err) {
      alert("Erreur suppression formulaire: " + err.message)
    } finally {
      setDeletingFormId(null)
    }
  }

  async function handleOpenSubmissionsModal(form) {
    setSubmissionsModal({
      formId: form.id,
      formTitle: form.title,
      submissions: [],
      loading: true
    })
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/forms/${form.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const payload = await res.json()
        setSubmissionsModal(prev => prev ? { ...prev, submissions: payload?.submissions || [], loading: false } : null)
      } else {
        setSubmissionsModal(prev => prev ? { ...prev, loading: false } : null)
      }
    } catch {
      setSubmissionsModal(prev => prev ? { ...prev, loading: false } : null)
    }
  }

  // Fonctions de gestion de la Question du Jour (QOTD Trivia)
  function handleAddTriviaQuestion(e) {
    if (e) e.preventDefault()
    if (!newTriviaQ.question.trim() || !newTriviaQ.answers.trim()) {
      setTriviaMsg({ type: "error", text: "Veuillez renseigner la question et au moins une réponse acceptée." })
      return
    }

    const answers = newTriviaQ.answers
      .split(",")
      .map(a => a.trim())
      .filter(Boolean)

    if (answers.length === 0) {
      setTriviaMsg({ type: "error", text: "Veuillez indiquer au moins une réponse valide." })
      return
    }

    const currentQuestions = Array.isArray(config?.trivia?.customQuestions)
      ? [...config.trivia.customQuestions]
      : []

    const newQuestionObj = {
      id: "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      question: newTriviaQ.question.trim(),
      answers,
      hint: newTriviaQ.hint.trim(),
      createdAt: new Date().toISOString()
    }

    const updated = [newQuestionObj, ...currentQuestions]
    updateField("trivia", {
      ...(config?.trivia || { enabled: true, rewardAmount: 25, mode: "both" }),
      customQuestions: updated
    })

    setNewTriviaQ({ question: "", answers: "", hint: "" })
    setTriviaMsg({ type: "success", text: "Question personnalisée ajoutée avec succès ! Pensez à enregistrer vos modifications." })
  }

  function handleDeleteTriviaQuestion(questionId) {
    const currentQuestions = Array.isArray(config?.trivia?.customQuestions)
      ? config.trivia.customQuestions
      : []
    const updated = currentQuestions.filter(q => q.id !== questionId)
    updateField("trivia", {
      ...(config?.trivia || { enabled: true, rewardAmount: 25, mode: "both" }),
      customQuestions: updated
    })
    setTriviaMsg({ type: "success", text: "Question supprimée. N'oubliez pas d'enregistrer." })
  }

  async function handleTriggerTrivia() {
    const channelId = config?.trivia?.channelId
    if (!channelId) {
      setTriviaMsg({ type: "error", text: "Veuillez d'abord configurer et enregistrer un salon Discord pour la Question du Jour." })
      return
    }

    setTriviaTriggering(true)
    setTriviaMsg(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/guilds/${id}/trivia/trigger`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.error || "Erreur lors de la publication de la question.")
      }
      setTriviaMsg({ type: "success", text: `Question envoyée avec succès sur Discord ! (« ${payload.question} »)` })
    } catch (err) {
      setTriviaMsg({ type: "error", text: err.message || "Impossible de publier la question." })
    } finally {
      setTriviaTriggering(false)
    }
  }

  // Fonctions de gestion des règles d'Auto-Sanction
  function handleAddSanctionRule() {
    const currentRules = Array.isArray(config?.autoSanctionRules) ? [...config.autoSanctionRules] : [
      { warnCount: 3, action: "timeout", durationMinutes: 10 },
      { warnCount: 5, action: "kick", durationMinutes: 0 },
      { warnCount: 7, action: "ban", durationMinutes: 0 }
    ]

    const warnNum = Math.max(1, Math.floor(Number(newSanctionWarns)))
    const existingIdx = currentRules.findIndex(r => Number(r.warnCount) === warnNum)

    const ruleObj = {
      warnCount: warnNum,
      action: newSanctionAction,
      durationMinutes: newSanctionAction === "timeout" ? Math.max(1, Number(newSanctionDuration)) : 0
    }

    if (existingIdx >= 0) {
      currentRules[existingIdx] = ruleObj
    } else {
      currentRules.push(ruleObj)
    }

    currentRules.sort((a, b) => a.warnCount - b.warnCount)
    updateField("autoSanctionRules", currentRules)
  }

  function handleDeleteSanctionRule(warnCount) {
    const currentRules = Array.isArray(config?.autoSanctionRules) ? [...config.autoSanctionRules] : [
      { warnCount: 3, action: "timeout", durationMinutes: 10 },
      { warnCount: 5, action: "kick", durationMinutes: 0 },
      { warnCount: 7, action: "ban", durationMinutes: 0 }
    ]
    const updated = currentRules.filter(r => Number(r.warnCount) !== Number(warnCount))
    updateField("autoSanctionRules", updated)
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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl w-full overflow-hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3 w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <Link
              to="/dashboard"
              title="Dashboard"
              aria-label="Dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <div className="hidden sm:block h-4 w-px bg-white/10 shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              {bot?.avatarUrl ? (
                <img
                  src={bot.avatarUrl}
                  alt={bot.username}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-indigo-500/30 shrink-0"
                />
              ) : null}
              <div className="leading-tight min-w-0">
                <p className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">{bot?.username || "God_Sparky"}</p>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En ligne</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageSelector />
            <button
              type="button"
              onClick={logout}
              title={t("common.logout")}
              aria-label={t("common.logout")}
              className="rounded-xl border border-white/10 bg-white/5 p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-rose-300 shrink-0 flex items-center gap-1"
            >
              <svg className="h-4 w-4 sm:hidden text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">{t("common.logout")}</span>
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
                {/* Sélecteur déroulant rapide pour Mobile (< md) */}
                <div className="md:hidden space-y-2">
                  <div className="relative">
                    <select
                      value={activeTab}
                      onChange={(e) => setActiveTab(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-indigo-500 shadow-xl pr-10"
                    >
                      <option value="stats">📊 {t("tabs.stats")}</option>
                      <option value="channels">📌 {t("tabs.channels")}</option>
                      <option value="security">🛡️ {t("tabs.security")}</option>
                      <option value="reactionRoles">🎭 {t("tabs.reactionRoles")} ({config?.reactionRoles?.length || 0})</option>
                      <option value="customCommands">🤖 {t("tabs.customCommands")} ({config?.customCommands?.length || 0})</option>
                      <option value="integrations">🔌 {t("tabs.integrations")} ({(config?.integrations?.youtube?.length || 0) + (config?.integrations?.twitch?.length || 0)})</option>
                      <option value="forms">📋 {t("tabs.forms")} ({config?.forms?.length || 0})</option>
                      <option value="trivia">💡 {t("tabs.trivia")} ({config?.trivia?.customQuestions?.length || 0})</option>
                      <option value="economy">🪙 {config?.economyEnabled === false ? `${t("tabs.economy")} (${t("common.disabled")})` : t("tabs.economy")}</option>
                      <option value="leveling">🏆 {config?.xpEnabled === false ? `${t("tabs.leveling")} (${t("common.disabled")})` : t("tabs.leveling")}</option>
                      <option value="giveaways">🎉 {t("tabs.giveaways")}</option>
                      <option value="tickets">🎫 {t("tabs.tickets")}</option>
                      <option value="embeds">📢 {t("tabs.embeds")}</option>
                      <option value="warns">📜 {t("tabs.warns")}</option>
                      <option value="audit">📜 {t("tabs.audit")}</option>
                      <option value="words">🚫 {t("tabs.words")} ({config?.badWords?.length || 0})</option>
                      <option value="minecraft">⛏️ {t("tabs.minecraft") || "Minecraft & RCON"}</option>
                      <option value="settings">⚙️ {t("tabs.settings")}</option>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Barre d'onglets défilable horizontalement sur mobile & enveloppante sur desktop */}
                <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-white/10 pb-3 md:flex-wrap md:pb-4 w-full min-w-0 max-w-full">
                  <TabButton active={activeTab === "stats"} onClick={() => setActiveTab("stats")} icon="📊" label={t("tabs.stats")} />
                  <TabButton active={activeTab === "channels"} onClick={() => setActiveTab("channels")} icon="📌" label={t("tabs.channels")} />
                  <TabButton active={activeTab === "security"} onClick={() => setActiveTab("security")} icon="🛡️" label={t("tabs.security")} />
                  <TabButton active={activeTab === "reactionRoles"} onClick={() => setActiveTab("reactionRoles")} icon="🎭" label={config?.reactionRoles?.length ? `${t("tabs.reactionRoles")} (${config.reactionRoles.length})` : t("tabs.reactionRoles")} />
                  <TabButton active={activeTab === "customCommands"} onClick={() => setActiveTab("customCommands")} icon="🤖" label={config?.customCommands?.length ? `${t("tabs.customCommands")} (${config.customCommands.length})` : t("tabs.customCommands")} />
                  <TabButton active={activeTab === "integrations"} onClick={() => setActiveTab("integrations")} icon="🔌" label={((config?.integrations?.youtube?.length || 0) + (config?.integrations?.twitch?.length || 0)) ? `${t("tabs.integrations")} (${(config?.integrations?.youtube?.length || 0) + (config?.integrations?.twitch?.length || 0)})` : t("tabs.integrations")} />
                  <TabButton active={activeTab === "forms"} onClick={() => setActiveTab("forms")} icon="📋" label={config?.forms?.length ? `${t("tabs.forms")} (${config.forms.length})` : t("tabs.forms")} />
                  <TabButton active={activeTab === "trivia"} onClick={() => setActiveTab("trivia")} icon="💡" label={config?.trivia?.customQuestions?.length ? `${t("tabs.trivia")} (${config.trivia.customQuestions.length})` : t("tabs.trivia")} />
                  <TabButton active={activeTab === "economy"} onClick={() => setActiveTab("economy")} icon="🪙" label={config?.economyEnabled === false ? `${t("tabs.economy")} (${t("common.disabled")})` : t("tabs.economy")} />
                  <TabButton active={activeTab === "leveling"} onClick={() => setActiveTab("leveling")} icon="🏆" label={config?.xpEnabled === false ? `${t("tabs.leveling")} (${t("common.disabled")})` : t("tabs.leveling")} />
                  <TabButton active={activeTab === "giveaways"} onClick={() => setActiveTab("giveaways")} icon="🎉" label={t("tabs.giveaways")} />
                  <TabButton active={activeTab === "tickets"} onClick={() => setActiveTab("tickets")} icon="🎫" label={t("tabs.tickets")} />
                  <TabButton active={activeTab === "embeds"} onClick={() => setActiveTab("embeds")} icon="📢" label={t("tabs.embeds")} />
                  <TabButton active={activeTab === "warns"} onClick={() => setActiveTab("warns")} icon="📜" label={t("tabs.warns")} />
                  <TabButton active={activeTab === "audit"} onClick={() => setActiveTab("audit")} icon="📜" label={t("tabs.audit")} />
                  <TabButton active={activeTab === "words"} onClick={() => setActiveTab("words")} icon="🚫" label={`${t("tabs.words")} (${config?.badWords?.length || 0})`} />
                  <TabButton active={activeTab === "minecraft"} onClick={() => setActiveTab("minecraft")} icon="⛏️" label={t("tabs.minecraft") || "Minecraft & RCON"} />
                  <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon="⚙️" label={t("tabs.settings")} />
                </div>

                {/* Section 0 : Statistiques & Métriques du Serveur */}
                {activeTab === "stats" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                          <span>📊</span> {t("stats.title")}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">{t("stats.desc")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={fetchStats}
                        disabled={statsLoading}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-50 shrink-0"
                      >
                        <svg className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{statsLoading ? t("common.loading") : t("common.refresh")}</span>
                      </button>
                    </div>

                    {/* Grille des Métriques Clés */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-xs font-semibold uppercase tracking-wider">{t("stats.totalMembers")}</span>
                          <span className="text-lg">👥</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
                          {statsData?.discord?.members ?? guild?.approximate_member_count ?? "—"}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            {statsData?.discord?.presences ?? 0} {t("stats.onlineMembers")}
                          </span>
                          {statsData?.discord?.humans !== undefined && (
                            <span className="text-slate-400 text-[11px]">
                              {statsData.discord.humans} hum. • {statsData.discord.bots} bots
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-xs font-semibold uppercase tracking-wider">{t("stats.totalChannels")}</span>
                          <span className="text-lg">💬</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
                          {statsData?.discord?.channels ?? textChannels.length + voiceChannels.length}
                        </p>
                        <p className="mt-2 text-xs text-slate-400 truncate">
                          {statsData?.discord?.textChannels ?? textChannels.length} textuels • {statsData?.discord?.voiceChannels ?? voiceChannels.length} vocaux
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-xs font-semibold uppercase tracking-wider">{t("stats.economyCirculation")}</span>
                          <span className="text-lg">🪙</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-amber-400 sm:text-3xl">
                          {(statsData?.economy?.totalCirculation ?? 0).toLocaleString()} {config?.currencySymbol || "$"}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {statsData?.economy?.totalAccounts ?? 0} comptes enregistrés
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-xs font-semibold uppercase tracking-wider">{t("stats.totalXp")}</span>
                          <span className="text-lg">🏆</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-indigo-400 sm:text-3xl">
                          {(statsData?.leveling?.totalXp ?? 0).toLocaleString()} XP
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {statsData?.leveling?.totalRanked ?? 0} membres classés
                        </p>
                      </div>
                    </div>

                    {/* Ligne informative secondaire (Warns, Tickets ouverts, Giveaways) */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/40 px-4 py-3 text-xs text-slate-300">
                        <span className="flex items-center gap-2">
                          <span className="text-base">🛡️</span>
                          <span className="text-slate-400">Avertissements actifs</span>
                        </span>
                        <span className="font-bold text-amber-300">{statsData?.moderation?.totalWarns ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/40 px-4 py-3 text-xs text-slate-300">
                        <span className="flex items-center gap-2">
                          <span className="text-base">🎫</span>
                          <span className="text-slate-400">Tickets ouverts</span>
                        </span>
                        <span className="font-bold text-sky-400">{statsData?.tickets?.totalTickets ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/40 px-4 py-3 text-xs text-slate-300">
                        <span className="flex items-center gap-2">
                          <span className="text-base">🎉</span>
                          <span className="text-slate-400">Giveaways créés</span>
                        </span>
                        <span className="font-bold text-indigo-300">{statsData?.giveaways?.totalGiveaways ?? 0}</span>
                      </div>
                    </div>

                    {/* Graphique Interactif d'Activité sur 7 Jours (SVG Line / Area Chart) */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white">{t("stats.activityChartTitle")}</h3>
                          <p className="text-xs text-slate-400">{t("stats.activityChartDesc")}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full bg-indigo-500" />
                            <span className="text-slate-300">{t("stats.messages")}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full bg-emerald-400" />
                            <span className="text-slate-300">{t("stats.joins")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 w-full overflow-hidden">
                        {statsData?.activityChart && statsData.activityChart.length > 0 ? (
                          <div className="relative w-full h-56">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>

                              <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                              <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                              <line x1="0" y1="160" x2="700" y2="160" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

                              {(() => {
                                const maxVal = Math.max(...statsData.activityChart.map(d => d.messages), 5)
                                const pts = statsData.activityChart.map((d, i) => {
                                  const x = (i / (statsData.activityChart.length - 1)) * 680 + 10
                                  const y = 170 - (d.messages / maxVal) * 130
                                  return { x, y, ...d }
                                })
                                const pathD = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "")
                                const areaD = `${pathD} L ${pts[pts.length - 1].x} 180 L ${pts[0].x} 180 Z`

                                return (
                                  <>
                                    <path d={areaD} fill="url(#msgGradient)" />
                                    <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    {pts.map((p, i) => (
                                      <g key={i}>
                                        <circle cx={p.x} cy={p.y} r="5" fill="#6366F1" />
                                        <text x={p.x} y="196" textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="600">{p.day}</text>
                                        <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">{p.messages}</text>
                                      </g>
                                    ))}
                                  </>
                                )
                              })()}
                            </svg>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-sm text-slate-400">
                            {t("stats.noData")}
                          </div>
                        )}
                      </div>

                      {/* Note explicative sur la traçabilité des métriques */}
                      <p className="mt-3 text-center text-[11px] text-slate-500">
                        💡 Les messages et arrivées sont enregistrés en temps réel par le bot au fur et à mesure des événements sur le serveur.
                      </p>
                    </div>

                    {/* 2 Colonnes de Classement : Top Actifs & Top Riches */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>🏆</span> {t("stats.topMembers")}
                        </h3>
                        <div className="mt-4 space-y-2">
                          {(statsData?.leveling?.topLevels || []).length > 0 ? (
                            statsData.leveling.topLevels.map((user, idx) => (
                              <div key={user.userId} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-sm">
                                <div className="flex items-center gap-3">
                                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs ${
                                    idx === 0 ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40" :
                                    idx === 1 ? "bg-slate-300/20 text-slate-200 ring-1 ring-slate-300/40" :
                                    idx === 2 ? "bg-amber-700/20 text-amber-500 ring-1 ring-amber-700/40" :
                                    "bg-white/5 text-slate-400"
                                  }`}>
                                    #{idx + 1}
                                  </span>
                                  {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-950/60 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                                      {(user.username || "U").slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-white text-xs leading-none">{user.username}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-indigo-400">Niv. {user.level}</span>
                                  <span className="text-xs text-slate-400 ml-2">({user.xp} XP)</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="py-6 text-center text-xs text-slate-500">Aucune donnée de niveau disponible.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>🪙</span> {t("stats.topEconomy")}
                        </h3>
                        <div className="mt-4 space-y-2">
                          {(statsData?.economy?.topRich || []).length > 0 ? (
                            statsData.economy.topRich.map((user, idx) => (
                              <div key={user.userId} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-sm">
                                <div className="flex items-center gap-3">
                                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs ${
                                    idx === 0 ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40" :
                                    idx === 1 ? "bg-slate-300/20 text-slate-200 ring-1 ring-slate-300/40" :
                                    idx === 2 ? "bg-amber-700/20 text-amber-500 ring-1 ring-amber-700/40" :
                                    "bg-white/5 text-slate-400"
                                  }`}>
                                    #{idx + 1}
                                  </span>
                                  {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-950/60 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30">
                                      {(user.username || "U").slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-white text-xs leading-none">{user.username}</p>
                                  </div>
                                </div>
                                <span className="font-bold text-amber-400">
                                  {user.balance.toLocaleString()} {config?.currencySymbol || "$"}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="py-6 text-center text-xs text-slate-500">Aucune donnée d'économie enregistrée.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 1 : Salons & Rôles */}
                {activeTab === "channels" && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">{t("channels.title")}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {t("channels.desc")}
                      </p>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <SelectField
                          label={t("channels.welcome")}
                          description={t("channels.welcomeDesc")}
                          value={config?.welcomeChannel}
                          onChange={val => updateField("welcomeChannel", val)}
                          options={textChannels}
                        />

                        <SelectField
                          label={t("channels.leave")}
                          description={t("channels.leaveDesc")}
                          value={config?.leaveChannel}
                          onChange={val => updateField("leaveChannel", val)}
                          options={textChannels}
                        />

                        <SelectField
                          label={t("channels.modLog")}
                          description={t("channels.modLogDesc")}
                          value={config?.modLogChannel}
                          onChange={val => updateField("modLogChannel", val)}
                          options={textChannels}
                        />

                        <SelectField
                          label={t("channels.vocHub")}
                          description={t("channels.vocHubDesc")}
                          value={config?.vocChannelId}
                          onChange={val => updateField("vocChannelId", val)}
                          options={voiceChannels}
                        />

                        <SelectField
                          label={t("channels.announcements")}
                          description={t("channels.announcementsDesc")}
                          value={config?.announcementChannel}
                          onChange={val => updateField("announcementChannel", val)}
                          options={[{ id: "", name: t("channels.autoDetect") }, ...textChannels]}
                          placeholder={t("channels.autoDetect")}
                        />
                      </div>
                    </div>

                    {/* Compteurs Vocaux Statistiques en Temps Réel */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>📊</span> Compteurs Vocaux en Direct (Voice Counters)
                          </h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Affichez le nombre de membres Discord et de joueurs Minecraft connectés en temps réel dans le nom de salons vocaux dédiés.
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={Boolean(config?.voiceCounters?.enabled)}
                            onChange={(e) =>
                              updateField("voiceCounters", {
                                ...(config?.voiceCounters || {}),
                                enabled: e.target.checked
                              })
                            }
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-slate-800 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-focus:outline-none" />
                        </label>
                      </div>

                      {config?.voiceCounters?.enabled && (
                        <div className="mt-6 grid gap-4 md:grid-cols-2 border-t border-white/5 pt-6">
                          <SelectField
                            label="Salon Vocal : Total Membres Discord"
                            description="Le nom du salon sera automatiquement synchronisé (ex: 👥・Membres : 150)."
                            value={config?.voiceCounters?.memberChannelId}
                            onChange={(val) =>
                              updateField("voiceCounters", {
                                ...(config?.voiceCounters || {}),
                                memberChannelId: val
                              })
                            }
                            options={[{ id: "", name: "Désactivé" }, ...voiceChannels]}
                          />

                          <SelectField
                            label="Salon Vocal : Joueurs Minecraft en Ligne"
                            description="Le nom du salon sera synchronisé avec le serveur Minecraft (ex: ⛏️・Minecraft : 12/50)."
                            value={config?.voiceCounters?.mcChannelId}
                            onChange={(val) =>
                              updateField("voiceCounters", {
                                ...(config?.voiceCounters || {}),
                                mcChannelId: val
                              })
                            }
                            options={[{ id: "", name: "Désactivé" }, ...voiceChannels]}
                          />
                        </div>
                      )}
                    </div>

                    {/* Personnalisation du Message de Bienvenue */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>🎉</span> {t("welcome.customTitle")}
                          </h2>
                          <p className="mt-1 text-sm text-slate-400">
                            {t("welcome.customDesc")}
                          </p>
                        </div>
                        {config?.welcomeChannel ? (
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                            Activé dans #{data?.channels?.find(c => c.id === config.welcomeChannel)?.name || "salon"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                            Sélectionnez un salon ci-dessus pour activer
                          </span>
                        )}
                      </div>

                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        {/* Paramètres de Bienvenue */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("welcome.titleInput")}
                              </label>
                              <input
                                type="text"
                                value={config?.welcomeTitle ?? ""}
                                onChange={e => updateField("welcomeTitle", e.target.value)}
                                placeholder="Bienvenue {username} !"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("welcome.colorInput")}
                              </label>
                              <div className="mt-1.5 flex items-center gap-2">
                                <input
                                  type="color"
                                  value={config?.welcomeColor || "#22C55E"}
                                  onChange={e => updateField("welcomeColor", e.target.value)}
                                  className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-1"
                                />
                                <span className="text-xs font-mono text-slate-400">
                                  {config?.welcomeColor || "#22C55E"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              {t("welcome.descInput")}
                            </label>
                            <textarea
                              rows={3}
                              value={config?.welcomeMessage ?? ""}
                              onChange={e => updateField("welcomeMessage", e.target.value)}
                              placeholder="Bienvenue {user} sur {server} ! Tu es notre {memberCount}ème membre. Installe-toi confortablement !"
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            />
                            <p className="mt-1.5 text-[11px] text-indigo-300">
                              💡 {t("welcome.tagsHelp")}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Toggle
                              label={t("welcome.thumbnail")}
                              checked={config?.welcomeThumbnail !== false}
                              onChange={v => updateField("welcomeThumbnail", v)}
                            />

                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("welcome.image")}
                              </label>
                              <input
                                type="url"
                                value={config?.welcomeImage ?? ""}
                                onChange={e => updateField("welcomeImage", e.target.value || null)}
                                placeholder="https://..."
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Message Privé (DM) de Bienvenue */}
                          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-3">
                            <Toggle
                              label={t("welcome.dmToggle")}
                              checked={Boolean(config?.welcomeDmEnabled)}
                              onChange={v => updateField("welcomeDmEnabled", v)}
                            />

                            {config?.welcomeDmEnabled && (
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                  {t("welcome.dmInput")}
                                </label>
                                <textarea
                                  rows={2}
                                  value={config?.welcomeDmMessage ?? ""}
                                  onChange={e => updateField("welcomeDmMessage", e.target.value)}
                                  placeholder="Salut {username}, bienvenue sur {server} ! N'hésite pas à consulter nos règles si tu as des questions."
                                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Aperçu Discord en Direct */}
                        <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950 p-5">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              {t("welcome.preview")}
                            </span>
                            <div className="mt-3 overflow-hidden rounded-xl bg-[#2b2d31] p-4 text-[#dbdee1] shadow-xl">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-3 flex-1 min-w-0">
                                  <div
                                    className="w-1 rounded-full shrink-0"
                                    style={{ backgroundColor: config?.welcomeColor || "#22C55E" }}
                                  />
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-white break-words">
                                      {(config?.welcomeTitle || "Bienvenue {username} !")
                                        .replace(/{username}/g, "Scorpion")
                                        .replace(/{server}/g, guild?.name || "Mon Serveur")}
                                    </h4>
                                    <p className="text-xs text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed">
                                      {(config?.welcomeMessage || "Bienvenue {user} sur le serveur {server} ! Tu es notre {memberCount}ème membre.")
                                        .replace(/{user}/g, "@Scorpion")
                                        .replace(/{username}/g, "Scorpion")
                                        .replace(/{server}/g, guild?.name || "Mon Serveur")
                                        .replace(/{memberCount}/g, String(guild?.approximate_member_count || 128))}
                                    </p>
                                  </div>
                                </div>

                                {config?.welcomeThumbnail !== false && (
                                  <div className="h-12 w-12 rounded-full bg-emerald-600/30 ring-2 ring-emerald-500/40 grid place-items-center text-xs font-bold text-white shrink-0">
                                    👤
                                  </div>
                                )}
                              </div>

                              {config?.welcomeImage && (
                                <div className="mt-3 overflow-hidden rounded-lg">
                                  <img
                                    src={config.welcomeImage}
                                    alt="Bannière bienvenue"
                                    className="w-full max-h-36 object-cover rounded-lg"
                                    onError={e => { e.target.style.display = "none" }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Personnalisation du Message de Départ (Au Revoir) */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>👋</span> {t("leave.customTitle")}
                          </h2>
                          <p className="mt-1 text-sm text-slate-400">
                            {t("leave.customDesc")}
                          </p>
                        </div>
                        {config?.leaveChannel ? (
                          <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30">
                            Activé dans #{data?.channels?.find(c => c.id === config.leaveChannel)?.name || "salon"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                            Sélectionnez un salon ci-dessus pour activer
                          </span>
                        )}
                      </div>

                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        {/* Paramètres d'Au Revoir */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("leave.titleInput")}
                              </label>
                              <input
                                type="text"
                                value={config?.leaveTitle ?? ""}
                                onChange={e => updateField("leaveTitle", e.target.value)}
                                placeholder="{username} nous a quitté..."
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("leave.colorInput")}
                              </label>
                              <div className="mt-1.5 flex items-center gap-2">
                                <input
                                  type="color"
                                  value={config?.leaveColor || "#EF4444"}
                                  onChange={e => updateField("leaveColor", e.target.value)}
                                  className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-1"
                                />
                                <span className="text-xs font-mono text-slate-400">
                                  {config?.leaveColor || "#EF4444"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              {t("leave.descInput")}
                            </label>
                            <textarea
                              rows={3}
                              value={config?.leaveMessage ?? ""}
                              onChange={e => updateField("leaveMessage", e.target.value)}
                              placeholder="Au revoir {username}, nous ne sommes plus que {memberCount} membres sur {server}."
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            />
                            <p className="mt-1.5 text-[11px] text-indigo-300">
                              💡 Variables : {"{username}"}, {"{server}"}, {"{memberCount}"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Toggle
                              label={t("leave.thumbnail")}
                              checked={config?.leaveThumbnail !== false}
                              onChange={v => updateField("leaveThumbnail", v)}
                            />

                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("leave.image")}
                              </label>
                              <input
                                type="url"
                                value={config?.leaveImage ?? ""}
                                onChange={e => updateField("leaveImage", e.target.value || null)}
                                placeholder="https://..."
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Aperçu Discord en Direct */}
                        <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950 p-5">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              {t("leave.preview")}
                            </span>
                            <div className="mt-3 overflow-hidden rounded-xl bg-[#2b2d31] p-4 text-[#dbdee1] shadow-xl">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-3 flex-1 min-w-0">
                                  <div
                                    className="w-1 rounded-full shrink-0"
                                    style={{ backgroundColor: config?.leaveColor || "#EF4444" }}
                                  />
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-white break-words">
                                      {(config?.leaveTitle || "{username} a quitté le serveur")
                                        .replace(/{username}/g, "Scorpion")
                                        .replace(/{server}/g, guild?.name || "Mon Serveur")}
                                    </h4>
                                    <p className="text-xs text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed">
                                      {(config?.leaveMessage || "Au revoir {username}, nous ne sommes plus que {memberCount} membres sur {server}.")
                                        .replace(/{username}/g, "Scorpion")
                                        .replace(/{server}/g, guild?.name || "Mon Serveur")
                                        .replace(/{memberCount}/g, String(guild?.approximate_member_count || 127))}
                                    </p>
                                  </div>
                                </div>

                                {config?.leaveThumbnail !== false && (
                                  <div className="h-12 w-12 rounded-full bg-rose-600/30 ring-2 ring-rose-500/40 grid place-items-center text-xs font-bold text-white shrink-0">
                                    👤
                                  </div>
                                )}
                              </div>

                              {config?.leaveImage && (
                                <div className="mt-3 overflow-hidden rounded-lg">
                                  <img
                                    src={config.leaveImage}
                                    alt="Bannière départ"
                                    className="w-full max-h-36 object-cover rounded-lg"
                                    onError={e => { e.target.style.display = "none" }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">{t("channels.autoRoleSection")}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {t("channels.autoRoleSectionDesc")}
                      </p>

                      <div className="mt-6 max-w-xl">
                        <SelectField
                          label={t("channels.autoRole")}
                          description={t("channels.autoRoleDesc")}
                          value={config?.autoRole}
                          onChange={val => updateField("autoRole", val)}
                          options={roles}
                          placeholder={t("channels.noRole")}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 2 : Sécurité & Modération */}
                {activeTab === "security" && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                    <h2 className="text-lg font-bold text-white">{t("sec.title")}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {t("sec.desc")}
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <Toggle
                        label={t("sec.antilink")}
                        description={t("sec.antilinkDesc")}
                        checked={Boolean(config?.antilink)}
                        onChange={v => updateField("antilink", v)}
                      />

                      <Toggle
                        label={t("sec.antispam")}
                        description={t("sec.antispamDesc")}
                        checked={Boolean(config?.antispam)}
                        onChange={v => updateField("antispam", v)}
                      />

                      <Toggle
                        label={t("sec.antibadwords")}
                        description={t("sec.antibadwordsDesc")}
                        checked={Boolean(config?.antiBadWords)}
                        onChange={v => updateField("antiBadWords", v)}
                      />

                      <Toggle
                        label={t("sec.autosanction")}
                        description={t("sec.autosanctionDesc")}
                        checked={Boolean(config?.autoSanction)}
                        onChange={v => updateField("autoSanction", v)}
                      />

                      <div className="md:col-span-2">
                        <Toggle
                          label={t("sec.antiraidMode")}
                          description={t("sec.antiraidModeDesc")}
                          checked={Boolean(config?.antiRaid)}
                          onChange={v => updateField("antiRaid", v)}
                        />
                      </div>
                    </div>

                    {/* Gestionnaire des Paliers d'Auto-Sanction */}
                    {config?.autoSanction && (
                      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/60 p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                              <span>⚖️</span> {t("autosanction.rulesTitle")}
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                              {t("autosanction.rulesDesc")}
                            </p>
                          </div>
                          <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/30 shrink-0">
                            {(config?.autoSanctionRules || []).length} palier(s) configuré(s)
                          </span>
                        </div>

                        {/* Liste des paliers configurés */}
                        <div className="grid gap-3 sm:grid-cols-3">
                          {((config?.autoSanctionRules && config.autoSanctionRules.length > 0)
                            ? config.autoSanctionRules
                            : [
                                { warnCount: 3, action: "timeout", durationMinutes: 10 },
                                { warnCount: 5, action: "kick", durationMinutes: 0 },
                                { warnCount: 7, action: "ban", durationMinutes: 0 }
                              ]
                          ).map((rule, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col justify-between rounded-xl border border-white/5 bg-slate-900/80 p-3.5 space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 font-bold text-xs text-amber-300 ring-1 ring-amber-400/30">
                                  {rule.warnCount} ⚠️
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSanctionRule(rule.warnCount)}
                                  className="text-xs text-slate-500 hover:text-rose-400 p-1"
                                  title="Supprimer ce palier"
                                >
                                  ✕
                                </button>
                              </div>

                              <div>
                                <p className="font-bold text-xs text-white capitalize">
                                  {rule.action === "timeout"
                                    ? `Mute (${rule.durationMinutes || 10} min)`
                                    : rule.action === "kick"
                                    ? "Expulsion (Kick)"
                                    : "Bannissement (Ban)"}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Appliqué à {rule.warnCount} avertissement{rule.warnCount > 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Formulaire d'ajout d'un palier */}
                        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                            {t("autosanction.addRule")}
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-400">
                                {t("autosanction.warnThreshold")}
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={newSanctionWarns}
                                onChange={e => setNewSanctionWarns(Math.max(1, Number(e.target.value)))}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-400">
                                {t("autosanction.action")}
                              </label>
                              <select
                                value={newSanctionAction}
                                onChange={e => setNewSanctionAction(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              >
                                <option value="timeout">{t("autosanction.actionTimeout")}</option>
                                <option value="kick">{t("autosanction.actionKick")}</option>
                                <option value="ban">{t("autosanction.actionBan")}</option>
                              </select>
                            </div>

                            {newSanctionAction === "timeout" ? (
                              <div>
                                <label className="text-[11px] font-semibold text-slate-400">
                                  {t("autosanction.duration")}
                                </label>
                                <select
                                  value={newSanctionDuration}
                                  onChange={e => setNewSanctionDuration(Number(e.target.value))}
                                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                >
                                  <option value={5}>5 minutes</option>
                                  <option value={10}>10 minutes</option>
                                  <option value={30}>30 minutes</option>
                                  <option value={60}>1 heure</option>
                                  <option value={1440}>1 jour</option>
                                  <option value={10080}>1 semaine</option>
                                </select>
                              </div>
                            ) : (
                              <div className="hidden sm:block" />
                            )}

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={handleAddSanctionRule}
                                className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
                              >
                                + Ajouter
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section Reaction Roles */}
                {activeTab === "reactionRoles" && (
                  <div className="space-y-6">
                    {/* Header Notification */}
                    {rrMessage && (
                      <div
                        className={`rounded-2xl border p-4 text-sm font-semibold flex items-center justify-between ${
                          rrMessage.type === "success"
                            ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                            : "border-rose-500/30 bg-rose-950/80 text-rose-200"
                        }`}
                      >
                        <span>{rrMessage.text}</span>
                        <button type="button" onClick={() => setRrMessage(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
                      </div>
                    )}

                    {/* Créateur de Panneau de Rôles */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🎭</span> {t("rr.title")}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">{t("rr.desc")}</p>

                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        {/* Formulaire de configuration */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              {t("rr.channel")}
                            </label>
                            <select
                              value={rrForm.channelId}
                              onChange={e => setRrForm(prev => ({ ...prev, channelId: e.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            >
                              <option value="">Sélectionner un salon...</option>
                              {textChannels.map(ch => (
                                <option key={ch.id} value={ch.id}>
                                  # {ch.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("rr.panelTitle")}
                              </label>
                              <input
                                type="text"
                                value={rrForm.title}
                                onChange={e => setRrForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="🎭 Choisissez vos rôles"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t("rr.embedColor")}
                              </label>
                              <div className="mt-1.5 flex items-center gap-2">
                                <input
                                  type="color"
                                  value={rrForm.color}
                                  onChange={e => setRrForm(prev => ({ ...prev, color: e.target.value }))}
                                  className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-1"
                                />
                                <span className="text-xs font-mono text-slate-400">{rrForm.color}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              {t("rr.panelDesc")}
                            </label>
                            <textarea
                              rows={2}
                              value={rrForm.description}
                              onChange={e => setRrForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Cliquez sur les options ci-dessous pour obtenir ou retirer vos rôles."
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Choix du style : Boutons ou Menu Déroulant */}
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Style d'affichage Discord
                            </label>
                            <div className="mt-1.5 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setRrForm(prev => ({ ...prev, displayType: "buttons" }))}
                                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                                  rrForm.displayType !== "dropdown"
                                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-sm"
                                    : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>🔘</span> Boutons
                              </button>
                              <button
                                type="button"
                                onClick={() => setRrForm(prev => ({ ...prev, displayType: "dropdown" }))}
                                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                                  rrForm.displayType === "dropdown"
                                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-sm"
                                    : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>📋</span> Menu Déroulant
                              </button>
                            </div>
                          </div>

                          {/* Ajout d'un bouton de rôle */}
                          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                              {t("rr.addRole")}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <select
                                  value={newRrRole.roleId}
                                  onChange={e => {
                                    const rId = e.target.value
                                    const foundRole = data?.roles?.find(r => r.id === rId)
                                    setNewRrRole(prev => ({
                                      ...prev,
                                      roleId: rId,
                                      label: prev.label || foundRole?.name || ""
                                    }))
                                  }}
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                >
                                  <option value="">Sélectionner un rôle...</option>
                                  {(data?.roles || []).filter(r => r.id !== guild?.id).map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <input
                                  type="text"
                                  placeholder={t("rr.btnLabel")}
                                  value={newRrRole.label}
                                  onChange={e => setNewRrRole(prev => ({ ...prev, label: e.target.value }))}
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <input
                                  type="text"
                                  placeholder={t("rr.btnEmoji")}
                                  value={newRrRole.emoji}
                                  onChange={e => setNewRrRole(prev => ({ ...prev, emoji: e.target.value }))}
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <select
                                  value={newRrRole.style}
                                  onChange={e => setNewRrRole(prev => ({ ...prev, style: e.target.value }))}
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                >
                                  <option value="PRIMARY">{t("rr.stylePrimary")}</option>
                                  <option value="SECONDARY">{t("rr.styleSecondary")}</option>
                                  <option value="SUCCESS">{t("rr.styleSuccess")}</option>
                                  <option value="DANGER">{t("rr.styleDanger")}</option>
                                </select>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (!newRrRole.roleId) {
                                  alert("Veuillez sélectionner un rôle.")
                                  return
                                }
                                if (rrForm.roles.some(r => r.roleId === newRrRole.roleId)) {
                                  alert("Ce rôle est déjà dans la liste.")
                                  return
                                }
                                setRrForm(prev => ({
                                  ...prev,
                                  roles: [...prev.roles, { ...newRrRole }]
                                }))
                                setNewRrRole({ roleId: "", label: "", emoji: "", style: "PRIMARY" })
                              }}
                              className="w-full rounded-xl bg-indigo-600/20 py-2 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30 hover:bg-indigo-600/30 transition"
                            >
                              + Ajouter ce bouton
                            </button>
                          </div>
                        </div>

                        {/* Prévisualisation Directe façon Discord */}
                        <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950 p-5">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Aperçu Discord en direct
                            </span>
                            <div className="mt-3 overflow-hidden rounded-xl bg-[#2b2d31] p-4 text-[#dbdee1] shadow-xl">
                              <div className="flex gap-3">
                                <div
                                  className="w-1 rounded-full shrink-0"
                                  style={{ backgroundColor: rrForm.color || "#6366F1" }}
                                />
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-white break-words">
                                    {rrForm.title || "Titre du panneau"}
                                  </h4>
                                  <p className="text-xs text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed">
                                    {rrForm.description || "Description du panneau..."}
                                  </p>
                                </div>
                              </div>

                              {/* Affichage façon Discord (Boutons ou Menu déroulant) */}
                              {rrForm.displayType === "dropdown" ? (
                                <div className="mt-4 space-y-2">
                                  <div className="rounded border border-white/10 bg-[#1e1f22] p-2.5 text-xs text-[#949ba4] flex items-center justify-between">
                                    <span>Sélectionnez vos rôles ({rrForm.roles.length} option{rrForm.roles.length > 1 ? "s" : ""})...</span>
                                    <span>▼</span>
                                  </div>
                                  {rrForm.roles.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {rrForm.roles.map((r, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                                          {r.emoji && <span>{r.emoji}</span>}
                                          <span>{r.label || "Rôle"}</span>
                                          <button
                                            type="button"
                                            onClick={() => setRrForm(prev => ({
                                              ...prev,
                                              roles: prev.roles.filter((_, idx) => idx !== i)
                                            }))}
                                            title="Supprimer"
                                            className="ml-1 text-slate-500 hover:text-white"
                                          >
                                            ✕
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {rrForm.roles.length === 0 && (
                                    <p className="text-xs italic text-slate-500 py-1">
                                      Aucune option ajoutée pour le moment.
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {rrForm.roles.map((r, i) => {
                                    const btnBg =
                                      r.style === "PRIMARY" ? "bg-[#5865f2] hover:bg-[#4752c4] text-white" :
                                      r.style === "SUCCESS" ? "bg-[#248046] hover:bg-[#1a6334] text-white" :
                                      r.style === "DANGER" ? "bg-[#da373c] hover:bg-[#a1282c] text-white" :
                                      "bg-[#4e5058] hover:bg-[#6d6f78] text-white"

                                    return (
                                      <div
                                        key={i}
                                        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold shadow-sm transition ${btnBg}`}
                                      >
                                        {r.emoji && <span>{r.emoji}</span>}
                                        <span>{r.label || "Rôle"}</span>
                                        <button
                                          type="button"
                                          onClick={() => setRrForm(prev => ({
                                            ...prev,
                                            roles: prev.roles.filter((_, idx) => idx !== i)
                                          }))}
                                          title="Supprimer ce rôle"
                                          className="ml-1 text-white/60 hover:text-white"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )
                                  })}
                                  {rrForm.roles.length === 0 && (
                                    <p className="text-xs italic text-slate-500 py-1">
                                      Aucun bouton ajouté pour le moment.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-6">
                            <button
                              type="button"
                              onClick={handleSendReactionRole}
                              disabled={sendingRr || rrForm.roles.length === 0}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
                            >
                              {sendingRr ? (
                                <>
                                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                  <span>{t("rr.sending")}</span>
                                </>
                              ) : (
                                <>
                                  <span>🚀</span>
                                  <span>{t("rr.sendDiscord")}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Liste des Panneaux Existants */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>📋</span> {t("rr.existingPanels")}
                      </h3>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {(config?.reactionRoles || []).length > 0 ? (
                          config.reactionRoles.map(panel => {
                            const targetChannel = data?.channels?.find(c => c.id === panel.channelId)
                            return (
                              <div
                                key={panel.id}
                                className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-3"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-bold text-sm text-white">{panel.title || "Panneau de Rôles"}</h4>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                        {panel.displayType === "dropdown" ? "📋 Menu" : "🔘 Boutons"}
                                      </span>
                                      <span className="text-[11px] font-mono text-indigo-400">
                                        #{targetChannel?.name || panel.channelId}
                                      </span>
                                    </div>
                                  </div>
                                  {panel.description && (
                                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{panel.description}</p>
                                  )}

                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {(panel.roles || []).map((r, ri) => (
                                      <span
                                        key={ri}
                                        className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-white/10"
                                      >
                                        {r.emoji && <span>{r.emoji}</span>}
                                        <span>{r.label || "Rôle"}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                                  <span className="text-[11px] text-slate-500">
                                    {panel.messageId ? `ID: ${panel.messageId.slice(0, 10)}...` : "Envoyé"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReactionRole(panel.id)}
                                    disabled={rrActionLoading === panel.id}
                                    className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-50"
                                  >
                                    {rrActionLoading === panel.id ? t("common.loading") : t("common.delete")}
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="col-span-2 py-8 text-center text-sm text-slate-500">
                            {t("rr.noPanels")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Auto-Répondeur & Commandes Personnalisées */}
                {activeTab === "customCommands" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                          <span>🤖</span> {t("cc.title")}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">{t("cc.desc")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenCcModal()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition shrink-0"
                      >
                        {t("cc.createBtn")}
                      </button>
                    </div>

                    {/* Aide sur les balises dynamiques */}
                    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-300">
                      <span className="font-bold">💡 {t("cc.tagsHelp")}</span>
                    </div>

                    {/* Liste des Déclencheurs Existants */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(config?.customCommands || []).length > 0 ? (
                        config.customCommands.map(cmd => (
                          <div
                            key={cmd.id}
                            className={`flex flex-col justify-between rounded-3xl border p-5 transition ${
                              cmd.enabled !== false
                                ? "border-white/10 bg-slate-900/60"
                                : "border-white/5 bg-slate-950/40 opacity-60"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-white bg-white/10 px-2.5 py-1 rounded-xl">
                                    {cmd.trigger}
                                  </span>
                                  <span className="rounded-lg bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                                    {cmd.matchType === "startsWith"
                                      ? "Commence par"
                                      : cmd.matchType === "contains"
                                      ? "Contient"
                                      : "Exact"}
                                  </span>
                                  {cmd.isEmbed && (
                                    <span className="rounded-lg bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                                      Embed
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCustomCommand(cmd.id)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                    cmd.enabled !== false ? "bg-indigo-600" : "bg-slate-700"
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                      cmd.enabled !== false ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300 line-clamp-3">
                                {cmd.isEmbed && cmd.embedTitle && (
                                  <p className="font-bold text-white mb-1">{cmd.embedTitle}</p>
                                )}
                                <p className="whitespace-pre-wrap">{cmd.response}</p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                              <button
                                type="button"
                                onClick={() => handleOpenCcModal(cmd)}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                              >
                                {t("common.edit")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomCommand(cmd.id)}
                                className="rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                              >
                                {t("common.delete")}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 rounded-3xl border border-white/5 bg-slate-900/40 py-12 text-center text-sm text-slate-400">
                          {t("cc.noTriggers")}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section Intégrations (YouTube & Twitch) */}
                {activeTab === "integrations" && (
                  <div className="space-y-8">
                    {/* Message Notification */}
                    {integrationMsg && (
                      <div
                        className={`rounded-2xl border p-4 text-sm font-semibold flex items-center justify-between ${
                          integrationMsg.type === "success"
                            ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                            : "border-rose-500/30 bg-rose-950/80 text-rose-200"
                        }`}
                      >
                        <span>{integrationMsg.text}</span>
                        <button type="button" onClick={() => setIntegrationMsg(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
                      </div>
                    )}

                    {/* Bloc Alertes YouTube */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-xl text-rose-500">
                          ▶️
                        </span>
                        <div>
                          <h2 className="text-lg font-bold text-white">Alertes Vidéos YouTube</h2>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Publiez automatiquement les nouvelles vidéos d'une chaîne dans le salon Discord de votre choix.
                          </p>
                        </div>
                      </div>

                      {/* Formulaire YouTube */}
                      <form onSubmit={handleAddYouTube} className="mt-6 grid gap-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Chaîne YouTube
                          </label>
                          <input
                            type="text"
                            placeholder="ex: @Craftor13 ou https://youtube.com/@Craftor13"
                            value={ytForm.channelInput}
                            onChange={e => setYtForm(prev => ({ ...prev, channelInput: e.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Salon d'Annonce Discord
                          </label>
                          <select
                            value={ytForm.discordChannelId}
                            onChange={e => setYtForm(prev => ({ ...prev, discordChannelId: e.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                          >
                            <option value="">Sélectionner un salon...</option>
                            {textChannels.map(ch => (
                              <option key={ch.id} value={ch.id}># {ch.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Rôle à Mentionner (Optionnel)
                          </label>
                          <select
                            value={ytForm.roleId}
                            onChange={e => setYtForm(prev => ({ ...prev, roleId: e.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                          >
                            <option value="">Aucun rôle (pas de ping)</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>@{r.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Message d'Annonce Custom
                          </label>
                          <input
                            type="text"
                            value={ytForm.customMessage}
                            onChange={e => setYtForm(prev => ({ ...prev, customMessage: e.target.value }))}
                            placeholder="🎬 Nouvelle vidéo de {author} ! 👉 {url}"
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                          />
                          <p className="mt-1 text-[10px] text-slate-500">Variables : &#123;author&#125;, &#123;title&#125;, &#123;url&#125;</p>
                        </div>

                        <div className="sm:col-span-2 flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={addingYt}
                            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 disabled:opacity-50"
                          >
                            {addingYt ? "Vérification de la chaîne..." : "+ Ajouter l'alerte YouTube"}
                          </button>
                        </div>
                      </form>

                      {/* Liste des alertes YouTube */}
                      <div className="mt-6 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Chaînes YouTube Surveillées ({(config?.integrations?.youtube || []).length})
                        </h3>
                        {(config?.integrations?.youtube || []).length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {config.integrations.youtube.map(alert => {
                              const chName = textChannels.find(c => c.id === alert.discordChannelId)?.name || alert.discordChannelId
                              const rName = roles.find(r => r.id === alert.roleId)?.name
                              return (
                                <div key={alert.id || alert.channelId} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                                  <div className="min-w-0 pr-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white truncate text-sm">{alert.channelTitle || alert.channelHandle}</span>
                                      <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">YouTube</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                      <span>📢 #{chName}</span>
                                      {rName && <span>• 🔔 @{rName}</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteYouTube(alert.id)}
                                    disabled={deletingIntegrationId === alert.id}
                                    className="shrink-0 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                                  >
                                    {deletingIntegrationId === alert.id ? "..." : "Supprimer"}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/5 bg-slate-950/30 py-8 text-center text-xs text-slate-400">
                            Aucune alerte YouTube configurée. Ajoutez votre chaîne ci-dessus pour activer les alertes automatiques.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bloc Alertes Twitch */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-xl text-purple-400">
                          🟣
                        </span>
                        <div>
                          <h2 className="text-lg font-bold text-white">Alertes Live Twitch</h2>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Déclenchez un ping instantané sur votre serveur dès que votre streamer préféré lance son stream.
                          </p>
                        </div>
                      </div>

                      {/* Formulaire Twitch */}
                      <form onSubmit={handleAddTwitch} className="mt-6 grid gap-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Pseudo / Chaîne Twitch
                          </label>
                          <input
                            type="text"
                            placeholder="ex: grimdalmc ou zerator"
                            value={twitchForm.streamerLogin}
                            onChange={e => setTwitchForm(prev => ({ ...prev, streamerLogin: e.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Salon d'Annonce Discord
                          </label>
                          <select
                            value={twitchForm.discordChannelId}
                            onChange={e => setTwitchForm(prev => ({ ...prev, discordChannelId: e.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                          >
                            <option value="">Sélectionner un salon...</option>
                            {textChannels.map(ch => (
                              <option key={ch.id} value={ch.id}># {ch.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Rôle à Mentionner (Optionnel)
                          </label>
                          <select
                            value={twitchForm.roleId}
                            onChange={e => setTwitchForm(prev => ({ ...prev, roleId: e.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                          >
                            <option value="">Aucun rôle (pas de ping)</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>@{r.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Message d'Annonce Custom
                          </label>
                          <input
                            type="text"
                            value={twitchForm.customMessage}
                            onChange={e => setTwitchForm(prev => ({ ...prev, customMessage: e.target.value }))}
                            placeholder="🟣 {streamer} est en LIVE sur Twitch ! 👉 {url}"
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                          />
                          <p className="mt-1 text-[10px] text-slate-500">Variables : &#123;streamer&#125;, &#123;game&#125;, &#123;title&#125;, &#123;url&#125;</p>
                        </div>

                        <div className="sm:col-span-2 flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={addingTwitch}
                            className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500 disabled:opacity-50"
                          >
                            {addingTwitch ? "Vérification sur Twitch..." : "+ Ajouter l'alerte Twitch"}
                          </button>
                        </div>
                      </form>

                      {/* Liste des alertes Twitch */}
                      <div className="mt-6 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Streamers Surveillés ({(config?.integrations?.twitch || []).length})
                        </h3>
                        {(config?.integrations?.twitch || []).length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {config.integrations.twitch.map(alert => {
                              const chName = textChannels.find(c => c.id === alert.discordChannelId)?.name || alert.discordChannelId
                              const rName = roles.find(r => r.id === alert.roleId)?.name
                              return (
                                <div key={alert.id || alert.streamerLogin} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                                  <div className="min-w-0 pr-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white truncate text-sm">{alert.streamerName || alert.streamerLogin}</span>
                                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${alert.isLive ? "bg-emerald-500/20 text-emerald-400 animate-pulse" : "bg-purple-500/10 text-purple-400"}`}>
                                        {alert.isLive ? "🔴 EN DIRECT" : "Twitch"}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                      <span>📢 #{chName}</span>
                                      {rName && <span>• 🔔 @{rName}</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTwitch(alert.id)}
                                    disabled={deletingIntegrationId === alert.id}
                                    className="shrink-0 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                                  >
                                    {deletingIntegrationId === alert.id ? "..." : "Supprimer"}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/5 bg-slate-950/30 py-8 text-center text-xs text-slate-400">
                            Aucune alerte Twitch configurée. Ajoutez votre streamer ci-dessus.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Formulaires & Candidatures */}
                {activeTab === "forms" && (
                  <div className="space-y-8">
                    {/* Message Notification */}
                    {formMsg && (
                      <div
                        className={`rounded-2xl border p-4 text-sm font-semibold flex items-center justify-between ${
                          formMsg.type === "success"
                            ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                            : "border-rose-500/30 bg-rose-950/80 text-rose-200"
                        }`}
                      >
                        <span>{formMsg.text}</span>
                        <button type="button" onClick={() => setFormMsg(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
                      </div>
                    )}

                    {/* Créateur de Formulaire */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-xl text-indigo-400">
                          📋
                        </span>
                        <div>
                          <h2 className="text-lg font-bold text-white">Créateur de Formulaire & Recrutements</h2>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Générez un bouton d'inscription interactif. Quand un membre clique dessus, une fenêtre modale Discord s'affiche.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSendForm} className="mt-6 space-y-6">
                        {/* Paramètres principaux */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Titre de l'Annonce / Formulaire
                            </label>
                            <input
                              type="text"
                              value={formBuilder.title}
                              onChange={e => setFormBuilder(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="ex: Candidature Recrutement Modérateur"
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Description & Consignes
                            </label>
                            <textarea
                              rows={2}
                              value={formBuilder.description}
                              onChange={e => setFormBuilder(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Expliquez ce qui est attendu des candidats..."
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Salon de Publication (Public)
                            </label>
                            <select
                              value={formBuilder.channelId}
                              onChange={e => setFormBuilder(prev => ({ ...prev, channelId: e.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            >
                              <option value="">Sélectionner le salon d'affichage...</option>
                              {textChannels.map(ch => (
                                <option key={ch.id} value={ch.id}># {ch.name}</option>
                              ))}
                            </select>
                            <p className="mt-1 text-[10px] text-slate-500">Là où le bot enverra l'embed avec le bouton "Postuler".</p>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Salon de Réception Staff (Privé)
                            </label>
                            <select
                              value={formBuilder.targetChannelId}
                              onChange={e => setFormBuilder(prev => ({ ...prev, targetChannelId: e.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            >
                              <option value="">Sélectionner le salon privé du staff...</option>
                              {textChannels.map(ch => (
                                <option key={ch.id} value={ch.id}># {ch.name}</option>
                              ))}
                            </select>
                            <p className="mt-1 text-[10px] text-slate-500">Où les candidatures arrivent avec les boutons Accepter/Refuser.</p>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Rôle à Attribuer en cas d'Acceptation (Optionnel)
                            </label>
                            <select
                              value={formBuilder.roleToGiveOnAccept}
                              onChange={e => setFormBuilder(prev => ({ ...prev, roleToGiveOnAccept: e.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            >
                              <option value="">Aucun rôle attribué</option>
                              {roles.map(r => (
                                <option key={r.id} value={r.id}>@{r.name}</option>
                              ))}
                            </select>
                            <p className="mt-1 text-[10px] text-slate-500">Attribué automatiquement au membre dès qu'un modérateur clique sur "Accepter".</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Texte Bouton</label>
                              <input
                                type="text"
                                value={formBuilder.buttonLabel}
                                onChange={e => setFormBuilder(prev => ({ ...prev, buttonLabel: e.target.value }))}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Emoji</label>
                              <input
                                type="text"
                                value={formBuilder.buttonEmoji}
                                onChange={e => setFormBuilder(prev => ({ ...prev, buttonEmoji: e.target.value }))}
                                placeholder="📝"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Style</label>
                              <select
                                value={formBuilder.buttonStyle}
                                onChange={e => setFormBuilder(prev => ({ ...prev, buttonStyle: e.target.value }))}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              >
                                <option value="PRIMARY">Bleu</option>
                                <option value="SUCCESS">Vert</option>
                                <option value="SECONDARY">Gris</option>
                                <option value="DANGER">Rouge</option>
                              </select>
                            </div>
                          </div>

                          {/* Option : Lier le formulaire aux tickets */}
                          <div className="sm:col-span-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>🎫</span> Lier ce formulaire aux tickets
                                </h4>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  Crée automatiquement un salon de ticket privé avec le membre et le staff dès la soumission de la candidature.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFormBuilder(prev => ({ ...prev, createTicket: !prev.createTicket }))}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  formBuilder.createTicket ? "bg-indigo-600" : "bg-slate-700"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    formBuilder.createTicket ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {formBuilder.createTicket && (
                              <div className="pt-2 border-t border-white/5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                                  Catégorie Discord des Tickets (Optionnel)
                                </label>
                                <select
                                  value={formBuilder.ticketCategoryId || ""}
                                  onChange={e => setFormBuilder(prev => ({ ...prev, ticketCategoryId: e.target.value }))}
                                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                >
                                  <option value="">Par défaut (Catégorie tickets configurée sur le serveur)</option>
                                  {categoryChannels.map(cat => (
                                    <option key={cat.id} value={cat.id}>📁 {cat.name}</option>
                                  ))}
                                </select>
                                <p className="mt-1 text-[10px] text-slate-500">
                                  Le salon privé du candidat sera créé sous cette catégorie.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Configuration des Questions (Modal Discord) */}
                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Questions du Formulaire ({(formBuilder.fields || []).length} / 5)
                              </h3>
                              <p className="text-[11px] text-slate-500">
                                Discord impose une limite stricte de 5 champs par pop-up Modal.
                              </p>
                            </div>
                            {(formBuilder.fields || []).length < 5 && (
                              <button
                                type="button"
                                onClick={handleAddFormField}
                                className="rounded-xl bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30"
                              >
                                + Ajouter une question
                              </button>
                            )}
                          </div>

                          <div className="mt-4 space-y-3">
                            {(formBuilder.fields || []).map((f, idx) => (
                              <div key={f.id || idx} className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-indigo-400">Question #{idx + 1}</span>
                                  {(formBuilder.fields || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFormField(idx)}
                                      className="text-xs text-rose-400 hover:text-rose-300"
                                    >
                                      Supprimer ✕
                                    </button>
                                  )}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      placeholder="Intitulé de la question (ex: Présentez vos motivations)..."
                                      value={f.label}
                                      onChange={e => handleUpdateFormField(idx, "label", e.target.value)}
                                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <select
                                      value={f.style}
                                      onChange={e => handleUpdateFormField(idx, "style", e.target.value)}
                                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    >
                                      <option value="paragraph">Paragraphe (Long)</option>
                                      <option value="short">Court (1 ligne)</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="Exemple ou placeholder indicatif..."
                                    value={f.placeholder}
                                    onChange={e => handleUpdateFormField(idx, "placeholder", e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-300 outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Aperçu Discord */}
                        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Aperçu du Panneau Discord</span>
                          <div className="mt-2 rounded-xl border-l-4 border-l-indigo-500 bg-slate-950/80 p-4">
                            <h4 className="text-sm font-bold text-white">{formBuilder.title || "Titre du formulaire"}</h4>
                            <p className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">{formBuilder.description || "Description..."}</p>
                            <p className="mt-2 text-[11px] text-slate-500 italic">*Cliquez sur le bouton ci-dessous pour soumettre votre candidature !*</p>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow">
                              {formBuilder.buttonEmoji} {formBuilder.buttonLabel || "Postuler"}
                            </span>
                          </div>
                        </div>

                        {/* Bouton de soumission */}
                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={sendingForm}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
                          >
                            {sendingForm ? "Publication sur Discord..." : "🚀 Publier le Formulaire sur Discord"}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Liste des formulaires actifs */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        Formulaires en Ligne ({(config?.forms || []).length})
                      </h3>
                      {(config?.forms || []).length > 0 ? (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          {config.forms.map(form => {
                            const pubCh = textChannels.find(c => c.id === form.channelId)?.name || form.channelId
                            const staffCh = textChannels.find(c => c.id === form.targetChannelId)?.name || form.targetChannelId
                            const autoRole = roles.find(r => r.id === form.roleToGiveOnAccept)?.name
                            return (
                              <div key={form.id} className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-white text-sm truncate">{form.title}</h4>
                                  <div className="flex items-center gap-1.5">
                                    {form.createTicket && (
                                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                        🎫 Ticket auto
                                      </span>
                                    )}
                                    <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                                      {form.fields?.length || 0} questions
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1 text-xs text-slate-400">
                                  <div>📢 Affiché dans : <span className="text-slate-200">#{pubCh}</span></div>
                                  <div>🛡️ Réception Staff : <span className="text-slate-200">#{staffCh}</span></div>
                                  {autoRole && <div>🎁 Rôle attribué : <span className="text-emerald-400">@{autoRole}</span></div>}
                                  {form.createTicket && <div className="text-amber-300/90 font-medium">🎫 Crée automatiquement un salon de ticket privé</div>}
                                </div>
                                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSubmissionsModal(form)}
                                    className="flex items-center gap-1.5 rounded-xl bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
                                  >
                                    📋 Voir les candidatures
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteForm(form.id)}
                                    disabled={deletingFormId === form.id}
                                    className="rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                                  >
                                    {deletingFormId === form.id ? "..." : "Supprimer"}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950/30 py-8 text-center text-xs text-slate-400">
                          Aucun formulaire actif. Remplissez le créateur ci-dessus pour publier votre première annonce de recrutement !
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section Question du Jour (QOTD Trivia) */}
                {activeTab === "trivia" && (
                  <div className="space-y-8">
                    {/* Message d'état */}
                    {triviaMsg && (
                      <div
                        className={`rounded-2xl border p-4 text-sm font-semibold flex items-center justify-between ${
                          triviaMsg.type === "success"
                            ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                            : "border-rose-500/30 bg-rose-950/80 text-rose-200"
                        }`}
                      >
                        <span>{triviaMsg.text}</span>
                        <button type="button" onClick={() => setTriviaMsg(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
                      </div>
                    )}

                    {/* Carte 1 : Paramètres du module */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-xl text-amber-400">
                            💡
                          </span>
                          <div>
                            <h2 className="text-lg font-bold text-white">Question du Jour & Trivia Interactive</h2>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Animez automatiquement votre serveur chaque jour avec une énigme ou un quiz. Le premier joueur qui trouve la bonne réponse dans le chat remporte une récompense en monnaie !
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => updateField("trivia", {
                            ...(config?.trivia || {}),
                            enabled: config?.trivia?.enabled === false ? true : false
                          })}
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            config?.trivia?.enabled !== false ? "bg-amber-500" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              config?.trivia?.enabled !== false ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {config?.trivia?.enabled !== false && (
                        <div className="mt-6 border-t border-white/10 pt-6 space-y-6">
                          <div className="grid gap-4 sm:grid-cols-3">
                            {/* Salon Discord */}
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Salon Discord Cible
                              </label>
                              <select
                                value={config?.trivia?.channelId || ""}
                                onChange={e => updateField("trivia", {
                                  ...(config?.trivia || {}),
                                  channelId: e.target.value || null
                                })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                              >
                                <option value="">-- Sélectionner un salon --</option>
                                {textChannels.map(ch => (
                                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                ))}
                              </select>
                              <p className="mt-1 text-[11px] text-slate-400">Où la question quotidienne sera postée.</p>
                            </div>

                            {/* Récompense */}
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Récompense du Vainqueur ({config?.currencySymbol || "💎"})
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10000"
                                value={config?.trivia?.rewardAmount ?? 25}
                                onChange={e => updateField("trivia", {
                                  ...(config?.trivia || {}),
                                  rewardAmount: Math.max(1, Math.floor(Number(e.target.value) || 25))
                                })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">Montant crédité sur le compte du joueur.</p>
                            </div>

                            {/* Mode de questions */}
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Mode de Questions
                              </label>
                              <select
                                value={config?.trivia?.mode || "both"}
                                onChange={e => updateField("trivia", {
                                  ...(config?.trivia || {}),
                                  mode: e.target.value
                                })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                              >
                                <option value="both">🌟 Mixte (Sparcky + Vos questions)</option>
                                <option value="custom">🎨 Personnalisé uniquement</option>
                                <option value="integrated">🧠 Sparcky uniquement (Minecraft & Pop-culture)</option>
                              </select>
                              <p className="mt-1 text-[11px] text-slate-400">Provenance des questions posées.</p>
                            </div>
                          </div>

                          {/* Action manuelle : Poser une question maintenant */}
                          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <div>
                              <h4 className="text-sm font-bold text-amber-200">⚡ Déclenchement Immédiat</h4>
                              <p className="text-xs text-amber-200/70">
                                Envoyez instantanément une question dans le salon sans attendre le tirage programmé du matin.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={triviaTriggering || !config?.trivia?.channelId}
                              onClick={handleTriggerTrivia}
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition hover:bg-amber-500 disabled:opacity-50"
                            >
                              {triviaTriggering ? "Publication..." : "⚡ Poser une question maintenant"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Carte 2 : Créer une Question Personnalisée */}
                    {config?.trivia?.enabled !== false && (
                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-xl text-indigo-400">
                            ➕
                          </span>
                          <div>
                            <h3 className="text-lg font-bold text-white">Ajouter une Question Personnalisée</h3>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Créez vos propres questions adaptées à votre communauté (serveur Minecraft, streamers, lore du serveur...).
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleAddTriviaQuestion} className="mt-6 space-y-4">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Intitulé de la Question
                            </label>
                            <input
                              type="text"
                              value={newTriviaQ.question}
                              onChange={e => setNewTriviaQ(prev => ({ ...prev, question: e.target.value }))}
                              placeholder="ex: Quel est le nom de la ville principale d'Uchronie ?"
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Réponses Acceptées (séparées par une virgule)
                              </label>
                              <input
                                type="text"
                                value={newTriviaQ.answers}
                                onChange={e => setNewTriviaQ(prev => ({ ...prev, answers: e.target.value }))}
                                placeholder="ex: uchronia, uchro, capitale"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">Insensible à la casse et aux accents.</p>
                            </div>

                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Indice (facultatif)
                              </label>
                              <input
                                type="text"
                                value={newTriviaQ.hint}
                                onChange={e => setNewTriviaQ(prev => ({ ...prev, hint: e.target.value }))}
                                placeholder="ex: Commence par un U..."
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
                            >
                              Ajouter la question
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Carte 3 : Liste des questions personnalisées */}
                    {config?.trivia?.enabled !== false && (
                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              Questions Personnalisées ({config?.trivia?.customQuestions?.length || 0})
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Ces questions seront tirées au sort lors des publications automatiques.
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 space-y-3">
                          {config?.trivia?.customQuestions?.length ? (
                            config.trivia.customQuestions.map((q, idx) => (
                              <div
                                key={q.id || idx}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-white/20"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                      Q#{idx + 1}
                                    </span>
                                    <h4 className="text-sm font-semibold text-white">{q.question}</h4>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                    <span>
                                      ✅ Réponses : <strong className="text-emerald-400">{(Array.isArray(q.answers) ? q.answers : [q.answers]).join(", ")}</strong>
                                    </span>
                                    {q.hint && (
                                      <span>
                                        💡 Indice : <span className="italic text-slate-300">{q.hint}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteTriviaQuestion(q.id)}
                                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 shrink-0 self-start sm:self-auto"
                                >
                                  Supprimer
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">
                              Aucune question personnalisée pour l'instant. Utilisez le formulaire ci-dessus pour en créer !
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Carte 4 : Pool de questions intégrées Sparcky */}
                    {config?.trivia?.enabled !== false && (
                      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-white">Questions Intégrées Sparcky (15)</h3>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Pool de culture générale Minecraft, Gaming et Pop-culture pré-embarqué dans le bot.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDefaultTrivia(prev => !prev)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                          >
                            {showDefaultTrivia ? "Masquer ▲" : "Afficher ▼"}
                          </button>
                        </div>

                        {showDefaultTrivia && (
                          <div className="mt-6 space-y-2.5 max-h-96 overflow-y-auto pr-2">
                            {(defaultTriviaList.length ? defaultTriviaList : [
                              { question: "Quel minerai se génère uniquement dans le Nether et permet d'améliorer les armures en diamant ?", answers: ["Netherite"], hint: "Commence par N..." },
                              { question: "Combien de lingots de fer faut-il au total pour fabriquer une enclume complète dans Minecraft ?", answers: ["31"], hint: "3 blocs de fer + 4 lingots..." },
                              { question: "Quelle est la nourriture préférée des renards dans Minecraft ?", answers: ["Baies sucrées"], hint: "Un petit fruit rouge..." },
                              { question: "Comment s'appelle le mob hostile tourbillonnant des Chambres des épreuves (1.21) ?", answers: ["Breeze"], hint: "Le cousin venteux du Blaze..." },
                              { question: "Combien de cœurs possède un Wither dans Minecraft en difficulté normale ?", answers: ["150 cœurs (300 PV)"], hint: "Le double du dragon..." }
                            ]).map((q, idx) => (
                              <div key={idx} className="rounded-xl border border-white/5 bg-slate-950/40 p-3 text-xs">
                                <span className="font-semibold text-slate-200">#{idx + 1} {q.question}</span>
                                <div className="mt-1 text-slate-400">
                                  <span className="text-emerald-400">Réponse : {(Array.isArray(q.answers) ? q.answers : [q.answers])[0]}</span>
                                  {q.hint && <span className="ml-3 text-amber-300/80 italic">Indice : {q.hint}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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

                      <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                        <Toggle
                          label="🎰 Autoriser les jeux de hasard (/coinflip, paris)"
                          description="Permet aux membres de parier leurs crédits au pile ou face ou dans les jeux d'argent."
                          checked={config?.gamblingEnabled !== false}
                          onChange={v => updateField("gamblingEnabled", v)}
                        />

                        {config?.gamblingEnabled !== false && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                              <label className="text-xs font-semibold text-slate-300">
                                🛑 Mise maximale autorisée (/coinflip)
                              </label>
                              <input
                                type="number"
                                min={10}
                                value={config?.gamblingMaxBet ?? 500}
                                onChange={e => updateField("gamblingMaxBet", Number(e.target.value))}
                                placeholder="Ex: 250 ou 500"
                                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">
                                Empêche les techniques de martingale et l'enrichissement exponentiel.
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                              <label className="text-xs font-semibold text-slate-300">
                                ⏳ Délai entre deux paris (secondes)
                              </label>
                              <input
                                type="number"
                                min={5}
                                value={config?.gamblingCooldown ?? 45}
                                onChange={e => updateField("gamblingCooldown", Number(e.target.value))}
                                placeholder="Ex: 45 ou 60"
                                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">
                                Bloque le spam et force les joueurs à patienter entre deux lancers.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Loterie Hebdomadaire Communautaire */}
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                        <Toggle
                          label="🎰 Loterie Hebdomadaire (/loterie)"
                          description="Permet aux membres d'acheter des tickets pour le jackpot hebdomadaire (tirage automatique chaque dimanche à 20h)."
                          checked={config?.lottery?.enabled !== false}
                          onChange={v => updateField("lottery", { ...(config?.lottery || {}), enabled: v })}
                        />

                        {config?.lottery?.enabled !== false && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                              <label className="text-xs font-semibold text-slate-300">
                                🎟️ Prix d'un ticket de loterie
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={config?.lottery?.ticketPrice ?? 50}
                                onChange={e => updateField("lottery", { ...(config?.lottery || {}), ticketPrice: Math.max(1, Number(e.target.value)) })}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                              <label className="text-xs font-semibold text-slate-300">
                                📢 Salon d'annonce des tirages
                              </label>
                              <select
                                value={config?.lottery?.channelId || ""}
                                onChange={e => updateField("lottery", { ...(config?.lottery || {}), channelId: e.target.value || null })}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                              >
                                <option value="">Par défaut (Général / Annonces)</option>
                                {textChannels.map(ch => (
                                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
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
                            setItemForm({ name: "", description: "", price: 200, stock: -1, type: "role", roleId: roles[0]?.id || "", minecraftCommand: "give {player} diamond 5" })
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
                                  <span>
                                    Type :{" "}
                                    <strong className="text-slate-300">
                                      {item.type === "role"
                                        ? "🎭 Rôle Discord"
                                        : item.type === "minecraft"
                                          ? "⛏️ Minecraft"
                                          : "📦 Objet"}
                                    </strong>
                                  </span>
                                  <span>
                                    Stock :{" "}
                                    <strong className="text-slate-300">
                                      {item.stock === -1 ? "Illimité" : item.stock}
                                    </strong>
                                  </span>
                                </div>

                                {item.type === "minecraft" && item.minecraftCommand && (
                                  <div className="mt-2 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-mono text-emerald-300 border border-emerald-500/20 truncate">
                                    ⚡ {item.minecraftCommand}
                                  </div>
                                )}

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
                                        roleId: item.roleId || "",
                                        minecraftCommand: item.minecraftCommand || ""
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
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-white">{user.username}</span>
                                      {user.minecraftUsername && (
                                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                                          <img
                                            src={`https://mc-heads.net/avatar/${encodeURIComponent(user.minecraftUsername)}/16.png`}
                                            alt={user.minecraftUsername}
                                            className="h-3.5 w-3.5 rounded-sm"
                                          />
                                          {user.minecraftUsername}
                                        </span>
                                      )}
                                    </div>
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
                          description={t("lvl.toggleDesc")}
                          checked={config?.xpEnabled !== false}
                          onChange={v => updateField("xpEnabled", v)}
                        />

                        <SelectField
                          label={t("lvl.channel")}
                          description={t("lvl.channelDesc")}
                          value={config?.xpChannelId}
                          onChange={val => updateField("xpChannelId", val)}
                          options={[
                            { id: "", name: t("lvl.channelDefault", "Dans le salon où le message a été envoyé (défaut)") },
                            { id: "none", name: t("lvl.channelSilent", "Désactiver les annonces (silencieux)") },
                            ...textChannels
                          ]}
                          placeholder={t("lvl.channelPlaceholder", "Même salon que le message")}
                        />
                      </div>
                    </div>

                    {/* Rôles de Récompenses (Level Rewards) */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">{t("lvl.rewardsTitle")}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {t("lvl.rewardsDesc")}
                      </p>

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="w-full sm:w-36">
                          <label className="text-xs font-semibold text-slate-400">{t("lvl.reqLevel", "Niveau requis")}</label>
                          <input
                            type="number"
                            min={1}
                            value={newLevelRoleLevel}
                            onChange={e => setNewLevelRoleLevel(Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="text-xs font-semibold text-slate-400">{t("lvl.assignedRole", "Rôle attribué")}</label>
                          <select
                            value={newLevelRoleRoleId}
                            onChange={e => setNewLevelRoleRoleId(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          >
                            <option value="">{t("lvl.selectRole", "Sélectionner un rôle...")}</option>
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
                            {t("lvl.linkRole", "+ Lier le rôle")}
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
                                      {t("demo.ecoLvlPrefix", "Niveau")} {lr.level}
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
                            {t("lvl.noTiers", "Aucun palier de niveau configuré pour l'instant.")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Classement XP */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <h2 className="text-lg font-bold text-white">{t("lvl.leaderboardTitle")}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {t("lvl.leaderboardDesc", "Top des utilisateurs ayant accumulé le plus d'XP.")}
                      </p>

                      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
                            <tr>
                              <th className="px-4 py-3">{t("lvl.colRank", "Rang")}</th>
                              <th className="px-4 py-3">{t("lvl.colMember", "Membre")}</th>
                              <th className="px-4 py-3">{t("lvl.colLevel", "Niveau")}</th>
                              <th className="px-4 py-3">{t("lvl.colXp", "XP Total")}</th>
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
                                    {t("demo.ecoLvlPrefix", "Niveau")} {u.level}
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
                                  {t("lvl.noXpUsers", "Aucun niveau enregistré pour le moment.")}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Giveaways */}
                {activeTab === "giveaways" && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white">{t("gw.title")}</h2>
                          <p className="mt-1 text-sm text-slate-400">{t("gw.desc")}</p>
                        </div>
                        <button
                          type="button"
                          onClick={fetchGiveaways}
                          disabled={giveawaysLoading}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition self-start sm:self-auto"
                        >
                          {giveawaysLoading ? t("common.loading") : `🔄 ${t("common.refresh")}`}
                        </button>
                      </div>

                      {gwMessage && (
                        <div className={`mt-4 rounded-2xl p-4 text-sm font-medium ${
                          gwMessage.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {gwMessage.text}
                        </div>
                      )}

                      {/* Formulaire de création */}
                      <form onSubmit={handleCreateGiveaway} className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                          ➕ {t("gw.createTitle")}
                        </h3>

                        {/* Sélecteur de type de récompense */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {t("gw.type")}
                          </label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[
                              { id: "coins", label: t("gw.typeCoins"), icon: "🪙" },
                              { id: "xp", label: t("gw.typeXp"), icon: "⭐" },
                              { id: "role", label: t("gw.typeRole"), icon: "🎭" },
                              { id: "other", label: t("gw.typeOther"), icon: "🎁" }
                            ].map((item) => {
                              const active = gwType === item.id
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setGwType(item.id)}
                                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                    active
                                      ? "border-indigo-500 bg-indigo-600/25 text-white shadow-sm ring-1 ring-indigo-500/50"
                                      : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-800/60"
                                  }`}
                                >
                                  <span>{item.icon}</span>
                                  <span className="truncate">{item.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Paramètres selon le type */}
                        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 space-y-3">
                          {gwType === "coins" && (
                            <div className="space-y-3">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t("gw.amount")} ({config?.currencySymbol || "$"})
                                  </label>
                                  <div className="relative mt-1.5">
                                    <input
                                      type="number"
                                      min="1"
                                      value={gwAmount}
                                      onChange={(e) => setGwAmount(e.target.value)}
                                      placeholder={t("gw.amountCoinsPlaceholder")}
                                      className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                      required
                                    />
                                    <span className="absolute right-3.5 top-2.5 text-sm font-bold text-amber-400">
                                      {config?.currencySymbol || "$"}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t("gw.prize")} <span className="text-slate-500 normal-case">(optionnel)</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={gwPrize}
                                    onChange={(e) => setGwPrize(e.target.value)}
                                    placeholder={gwAmount ? `${Number(gwAmount || 0).toLocaleString()} ${config?.currencySymbol || "$"}` : t("gw.prizePlaceholder")}
                                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-amber-300/80">
                                {t("gw.coinsHint")}
                              </p>
                            </div>
                          )}

                          {gwType === "xp" && (
                            <div className="space-y-3">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t("gw.amount")} (XP)
                                  </label>
                                  <div className="relative mt-1.5">
                                    <input
                                      type="number"
                                      min="1"
                                      value={gwAmount}
                                      onChange={(e) => setGwAmount(e.target.value)}
                                      placeholder={t("gw.amountXpPlaceholder")}
                                      className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                      required
                                    />
                                    <span className="absolute right-3.5 top-2.5 text-sm font-bold text-indigo-400">
                                      XP
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t("gw.prize")} <span className="text-slate-500 normal-case">(optionnel)</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={gwPrize}
                                    onChange={(e) => setGwPrize(e.target.value)}
                                    placeholder={gwAmount ? `${Number(gwAmount || 0).toLocaleString()} XP` : t("gw.prizePlaceholder")}
                                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-indigo-300/80">
                                {t("gw.xpHint")}
                              </p>
                            </div>
                          )}

                          {gwType === "role" && (
                            <div className="space-y-3">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t("gw.roleLabel")}
                                  </label>
                                  <select
                                    value={gwRoleId}
                                    onChange={(e) => setGwRoleId(e.target.value)}
                                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                    required
                                  >
                                    <option value="">-- {t("gw.selectRole")} --</option>
                                    {roles.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        @{r.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t("gw.prize")} <span className="text-slate-500 normal-case">(optionnel)</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={gwPrize}
                                    onChange={(e) => setGwPrize(e.target.value)}
                                    placeholder={gwRoleId ? `Rôle @${roles.find(r => r.id === gwRoleId)?.name || "VIP"}` : t("gw.prizePlaceholder")}
                                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-purple-300/80">
                                {t("gw.roleHint")}
                              </p>
                            </div>
                          )}

                          {gwType === "other" && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  {t("gw.prize")}
                                </label>
                                <input
                                  type="text"
                                  value={gwPrize}
                                  onChange={(e) => setGwPrize(e.target.value)}
                                  placeholder={t("gw.prizePlaceholder")}
                                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                  required
                                />
                              </div>
                              <p className="text-xs text-slate-400">
                                {t("gw.otherHint")}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                              {t("gw.channel")}
                            </label>
                            <select
                              value={gwChannel}
                              onChange={(e) => setGwChannel(e.target.value)}
                              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              required
                            >
                              <option value="">-- {t("gw.channelPlaceholder")} --</option>
                              {textChannels.map((c) => (
                                <option key={c.id} value={c.id}>
                                  #{c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                              {t("gw.duration")}
                            </label>
                            <div className="mt-1.5 flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={gwDuration}
                                onChange={(e) => setGwDuration(e.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                required
                              />
                              <div className="flex gap-1 shrink-0">
                                {[
                                  { label: "15m", val: 15 },
                                  { label: "1h", val: 60 },
                                  { label: "24h", val: 1440 },
                                  { label: "7j", val: 10080 }
                                ].map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => setGwDuration(preset.val.toString())}
                                    className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                              {t("gw.winnersCount")}
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={gwWinners}
                              onChange={(e) => setGwWinners(e.target.value)}
                              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={gwSubmitting}
                            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
                          >
                            {gwSubmitting ? t("gw.starting") : t("gw.btnStart")}
                          </button>
                        </div>
                      </form>

                      {/* Liste des Giveaways */}
                      <div className="mt-8">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                          📜 {t("gw.listTitle")} ({giveawaysList.length})
                        </h3>

                        {giveawaysLoading && giveawaysList.length === 0 ? (
                          <p className="mt-4 text-sm text-slate-500">{t("common.loading")}</p>
                        ) : giveawaysList.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
                            {t("gw.noGiveaways")}
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {giveawaysList.map((g) => {
                              const isEnded = Boolean(g.isEnded)
                              const channelName = textChannels.find((c) => c.id === g.channelId)?.name || g.channelId
                              const endTimeDate = new Date(g.endTime)
                              const isExpired = !isEnded && endTimeDate <= new Date()

                              return (
                                <div
                                  key={g.id}
                                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border p-4.5 transition ${
                                    isEnded
                                      ? "border-white/5 bg-slate-900/40 opacity-75"
                                      : "border-indigo-500/30 bg-slate-900/80 shadow-md"
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-base font-bold text-white">🎁 {g.prize}</span>

                                      {g.rewardType === "coins" && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                                          🪙 {g.rewardAmount ? `${g.rewardAmount.toLocaleString()} ${config?.currencySymbol || "$"}` : "Économie"}
                                        </span>
                                      )}
                                      {g.rewardType === "xp" && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                                          ⭐ {g.rewardAmount ? `${g.rewardAmount.toLocaleString()} XP` : "XP"}
                                        </span>
                                      )}
                                      {g.rewardType === "role" && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                                          🎭 @{roles.find((r) => r.id === g.rewardRoleId)?.name || "Rôle"}
                                        </span>
                                      )}
                                      {(!g.rewardType || g.rewardType === "other") && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/60 border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                                          🎁 {t("gw.typeOther")}
                                        </span>
                                      )}

                                      <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                          isEnded
                                            ? "bg-slate-700 text-slate-300"
                                            : isExpired
                                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        }`}
                                      >
                                        {isEnded ? t("gw.statusEnded") : isExpired ? "Expiration..." : t("gw.statusActive")}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                      <span>📢 #{channelName}</span>
                                      <span>🏆 {g.winnersCount} {t("gw.winnersCount")}</span>
                                      <span>👥 {g.participantsCount || 0} {t("gw.participants")}</span>
                                      <span>⏰ {endTimeDate.toLocaleString()}</span>
                                    </div>

                                    {isEnded && (
                                      <div className="mt-1 text-xs text-indigo-300 font-medium">
                                        {t("gw.winners")} {g.winners && g.winners.length > 0 ? (
                                          <span>
                                            {g.winners.map((wid) => `<@${wid}>`).join(", ")}
                                          </span>
                                        ) : (
                                          <span className="italic text-slate-500">{t("gw.noWinners")}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {!isEnded ? (
                                      <button
                                        type="button"
                                        onClick={() => handleEndGiveaway(g.id)}
                                        disabled={gwActionLoading === g.id}
                                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
                                      >
                                        {gwActionLoading === g.id ? t("common.loading") : t("gw.btnEnd")}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleRerollGiveaway(g.id)}
                                        disabled={gwActionLoading === g.id}
                                        className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition disabled:opacity-50"
                                      >
                                        {gwActionLoading === g.id ? t("common.loading") : t("gw.btnReroll")}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGiveaway(g.id)}
                                      disabled={gwActionLoading === g.id}
                                      className="rounded-xl border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/15 transition disabled:opacity-50"
                                    >
                                      {t("gw.btnDelete")}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
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
                          <h2 className="text-lg font-bold text-white">{t("tkt.title")}</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            {t("tkt.desc")}
                          </p>
                        </div>
                        {ticketData?.settings ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            {t("common.active")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                            {t("common.disabled")}
                          </span>
                        )}
                      </div>

                      <div className="mt-6 space-y-4">
                        <Toggle
                          label={t("tkt.toggle")}
                          description={t("tkt.toggleDesc")}
                          checked={Boolean(config?.ticketEnabled)}
                          onChange={v => updateField("ticketEnabled", v)}
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                          <SelectField
                            label={t("tkt.category")}
                            description={t("tkt.categoryDesc")}
                            value={config?.ticketCategoryId}
                            onChange={val => updateField("ticketCategoryId", val)}
                            options={categoryChannels}
                            placeholder="Sélectionner une catégorie"
                          />

                          <SelectField
                            label={t("tkt.supportRole")}
                            description={t("tkt.supportRoleDesc")}
                            value={config?.ticketSupportRoleId}
                            onChange={val => updateField("ticketSupportRoleId", val)}
                            options={roles}
                            placeholder="Sélectionner un rôle"
                          />

                          <SelectField
                            label={t("tkt.logChannel")}
                            description={t("tkt.logChannelDesc")}
                            value={config?.ticketLogChannelId}
                            onChange={val => updateField("ticketLogChannelId", val)}
                            options={textChannels}
                            placeholder="Sélectionner un salon de logs"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                          <label className="text-sm font-semibold text-slate-100">{t("tkt.types")}</label>
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
                      <h2 className="text-lg font-bold text-white">{t("tkt.deployTitle")}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {t("tkt.deployDesc")}
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
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white">{t("emb.title")}</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            {t("emb.desc")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-8 lg:grid-cols-2">
                        {/* Formulaire à gauche */}
                        <div className="space-y-5">
                          {/* Salon Discord */}
                          <div>
                            <label className="text-xs font-semibold text-slate-300">{t("emb.channel")}</label>
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

                          {/* Auteur Optionnel */}
                          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-3.5 space-y-3">
                            <span className="text-xs font-semibold text-slate-300">{t("emb.author")}</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] text-slate-400">{t("emb.authorName")}</label>
                                <input
                                  type="text"
                                  value={embedForm.author || ""}
                                  onChange={e => setEmbedForm({ ...embedForm, author: e.target.value })}
                                  placeholder="ex: Sparcky Staff"
                                  maxLength={256}
                                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-slate-400">{t("emb.authorIcon")}</label>
                                <input
                                  type="url"
                                  value={embedForm.authorIcon || ""}
                                  onChange={e => setEmbedForm({ ...embedForm, authorIcon: e.target.value })}
                                  placeholder="https://..."
                                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Titre */}
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-slate-300">{t("emb.embedTitle")}</label>
                              <span className="text-[11px] text-slate-500">{(embedForm.title || "").length}/256</span>
                            </div>
                            <input
                              type="text"
                              value={embedForm.title}
                              onChange={e => setEmbedForm({ ...embedForm, title: e.target.value })}
                              placeholder={t("emb.embedTitlePlaceholder")}
                              maxLength={256}
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-slate-300">{t("emb.embedDesc")}</label>
                              <span className="text-[11px] text-slate-500">{(embedForm.description || "").length}/4096</span>
                            </div>
                            <textarea
                              rows={4}
                              value={embedForm.description}
                              onChange={e => setEmbedForm({ ...embedForm, description: e.target.value })}
                              placeholder={t("emb.embedDescPlaceholder")}
                              maxLength={4096}
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500 font-sans"
                            />
                          </div>

                          {/* Couleur */}
                          <div>
                            <label className="text-xs font-semibold text-slate-300">{t("emb.color")}</label>
                            <div className="mt-1 flex items-center gap-3">
                              <input
                                type="color"
                                value={embedForm.color}
                                onChange={e => setEmbedForm({ ...embedForm, color: e.target.value })}
                                className="h-10 w-14 cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-1"
                              />
                              <div className="flex flex-wrap gap-1">
                                {["#6366F1", "#5865F2", "#10B981", "#EF4444", "#F59E0B", "#EC4899", "#3B82F6", "#8B5CF6"].map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEmbedForm({ ...embedForm, color: c })}
                                    style={{ backgroundColor: c }}
                                    className={`h-6 w-6 rounded-lg ring-1 transition hover:scale-110 ${
                                      embedForm.color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-white scale-110" : "ring-white/20"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Champs Personnalisés (Fields) */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-t border-white/10 pt-4">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-white uppercase tracking-wider">
                                  {t("emb.fields")}
                                </label>
                                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                                  {(embedForm.fields || []).length}/25
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleAddEmbedField}
                                disabled={(embedForm.fields || []).length >= 25}
                                className="rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-40 transition"
                              >
                                {t("emb.addField")}
                              </button>
                            </div>

                            {(!embedForm.fields || embedForm.fields.length === 0) ? (
                              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-400">
                                Aucun champ personnalisé. Cliquez sur "{t("emb.addField")}" pour structurer votre message en colonnes ou blocs.
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                                {embedForm.fields.map((field, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 space-y-2.5 transition hover:border-white/20"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-indigo-400">
                                        Champ #{idx + 1}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={() => handleMoveEmbedField(idx, -1)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
                                          title="Monter"
                                        >
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === embedForm.fields.length - 1}
                                          onClick={() => handleMoveEmbedField(idx, 1)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
                                          title="Descendre"
                                        >
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveEmbedField(idx)}
                                          className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition ml-1"
                                          title={t("emb.fieldDelete")}
                                        >
                                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>

                                    <div>
                                      <input
                                        type="text"
                                        value={field.name}
                                        onChange={e => handleUpdateEmbedField(idx, "name", e.target.value)}
                                        placeholder={t("emb.fieldNamePlaceholder")}
                                        maxLength={256}
                                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                      />
                                    </div>

                                    <div>
                                      <textarea
                                        rows={2}
                                        value={field.value}
                                        onChange={e => handleUpdateEmbedField(idx, "value", e.target.value)}
                                        placeholder={t("emb.fieldValuePlaceholder")}
                                        maxLength={1024}
                                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2 pt-0.5">
                                      <input
                                        id={`inline-field-${idx}`}
                                        type="checkbox"
                                        checked={Boolean(field.inline)}
                                        onChange={e => handleUpdateEmbedField(idx, "inline", e.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                                      />
                                      <label htmlFor={`inline-field-${idx}`} className="text-[11px] text-slate-300 cursor-pointer">
                                        {t("emb.fieldInline")} <span className="text-slate-500">(max 3 côte à côte sur Discord)</span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Images Banner & Thumbnail */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="text-xs font-semibold text-slate-300">{t("emb.image")}</label>
                              <input
                                type="url"
                                value={embedForm.image}
                                onChange={e => setEmbedForm({ ...embedForm, image: e.target.value })}
                                placeholder="https://..."
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-300">{t("emb.thumbnail")}</label>
                              <input
                                type="url"
                                value={embedForm.thumbnail}
                                onChange={e => setEmbedForm({ ...embedForm, thumbnail: e.target.value })}
                                placeholder="https://..."
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Footer */}
                          <div>
                            <label className="text-xs font-semibold text-slate-300">{t("emb.footer")}</label>
                            <input
                              type="text"
                              value={embedForm.footer}
                              onChange={e => setEmbedForm({ ...embedForm, footer: e.target.value })}
                              placeholder="Texte du bas..."
                              maxLength={2048}
                              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Bouton d'envoi */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleSendEmbed}
                              disabled={sendingEmbed}
                              className="w-full rounded-2xl bg-indigo-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {sendingEmbed ? (
                                <>
                                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                  </svg>
                                  <span>{t("emb.sending")}</span>
                                </>
                              ) : (
                                <span>{t("emb.sendBtn")}</span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Prévisualisation Discord fidèle à droite */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                              👁️ {t("emb.previewTitle")}
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {t("emb.previewSub")}
                            </span>
                          </div>

                          {/* Message container (Discord Chat Dark Theme #313338) */}
                          <div className="mt-3 rounded-2xl border border-white/10 bg-[#313338] p-4 sm:p-5 text-[#dbdee1] shadow-2xl font-sans">
                            {/* Message Header */}
                            <div className="flex items-center gap-3">
                              {bot?.avatarUrl ? (
                                <img src={bot.avatarUrl} alt="Bot" className="h-10 w-10 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 grid place-items-center font-bold text-white shrink-0">
                                  ⚡
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white text-[15px] hover:underline cursor-pointer">
                                    {bot?.username || "God_Sparky"}
                                  </span>
                                  <span className="rounded bg-[#5865f2] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                                    BOT
                                  </span>
                                </div>
                                <span className="text-[11px] text-[#949ba4]">
                                  Aujourd'hui à {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Embed Card (Discord Embed Dark #2b2d31 with Left Accent Border) */}
                            <div
                              className="mt-3 max-w-[520px] rounded-[4px] bg-[#2b2d31] border-l-[4px] p-4 text-[#dbdee1] shadow-md space-y-3"
                              style={{ borderColor: embedForm.color || "#6366F1" }}
                            >
                              {/* Auteur */}
                              {embedForm.author && (
                                <div className="flex items-center gap-2">
                                  {embedForm.authorIcon && (
                                    <img
                                      src={embedForm.authorIcon}
                                      alt="Auteur"
                                      className="h-5 w-5 rounded-full object-cover shrink-0"
                                      onError={e => { e.currentTarget.style.display = 'none' }}
                                    />
                                  )}
                                  <span className="text-xs font-semibold text-white">
                                    {embedForm.author}
                                  </span>
                                </div>
                              )}

                              {/* Zone Titre, Description et Miniature */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  {embedForm.title && (
                                    <h4 className="text-[16px] font-bold text-white leading-snug hover:underline cursor-pointer">
                                      {embedForm.title}
                                    </h4>
                                  )}
                                  {embedForm.description && (
                                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-[#dbdee1]">
                                      {embedForm.description}
                                    </p>
                                  )}
                                </div>

                                {embedForm.thumbnail && (
                                  <img
                                    src={embedForm.thumbnail}
                                    alt="Miniature"
                                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-[4px] object-cover shrink-0 ml-2"
                                    onError={e => { e.currentTarget.style.display = 'none' }}
                                  />
                                )}
                              </div>

                              {/* Champs Personnalisés (Fields) en Grille Discord */}
                              {embedForm.fields && embedForm.fields.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 pt-1">
                                  {embedForm.fields.map((field, idx) => (
                                    <div
                                      key={idx}
                                      className={field.inline ? "col-span-1" : "col-span-full"}
                                    >
                                      <div className="text-[13px] font-bold text-white leading-tight">
                                        {field.name || <span className="italic text-[#949ba4]">(Nom du champ)</span>}
                                      </div>
                                      <div className="text-[13px] text-[#dbdee1] whitespace-pre-wrap leading-relaxed mt-0.5">
                                        {field.value || <span className="italic text-[#949ba4]">(Valeur du champ)</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Bannière Image */}
                              {embedForm.image && (
                                <img
                                  src={embedForm.image}
                                  alt="Bannière"
                                  className="mt-3 max-h-64 w-full rounded-[4px] object-cover"
                                  onError={e => { e.currentTarget.style.display = 'none' }}
                                />
                              )}

                              {/* Pied de page (Footer) */}
                              {(embedForm.footer || embedForm.title || embedForm.description || (embedForm.fields && embedForm.fields.length > 0)) && (
                                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#949ba4] pt-1 border-t border-white/5">
                                  {embedForm.footer && <span>{embedForm.footer}</span>}
                                  {embedForm.footer && <span>•</span>}
                                  <span>Aujourd'hui à {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
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

                {/* Section Journal d'Audit & Logs en Direct */}
                {activeTab === "audit" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                          <span>📜</span> {t("audit.title")}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">{t("audit.desc")}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Toggle Auto-Refresh */}
                        <button
                          type="button"
                          onClick={() => setAuditAutoRefresh(prev => !prev)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            auditAutoRefresh
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${auditAutoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                          <span>{t("audit.liveUpdates")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={fetchAuditLogs}
                          disabled={auditLoading}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          <svg className={`h-4 w-4 ${auditLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>{auditLoading ? t("common.loading") : t("common.refresh")}</span>
                        </button>
                      </div>
                    </div>

                    {!hasAuditPermission && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
                        <span className="text-base">⚠️</span>
                        <div>
                          <p className="font-bold">Permissions Discord incomplètes</p>
                          <p className="mt-0.5 text-amber-300/80">{t("audit.permissionWarning")}</p>
                        </div>
                      </div>
                    )}

                    {/* Filtres et Recherche */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "all", label: t("audit.filterAll") },
                          { id: "moderation", label: t("audit.filterMod") },
                          { id: "roles", label: t("audit.filterRoles") },
                          { id: "channels", label: t("audit.filterChannels") },
                          { id: "messages", label: t("audit.filterMessages") }
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setAuditFilter(f.id)}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                              auditFilter === f.id
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "border border-white/5 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <div className="relative sm:w-72">
                        <input
                          type="text"
                          value={auditSearch}
                          onChange={e => setAuditSearch(e.target.value)}
                          placeholder={t("audit.searchPlaceholder")}
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                        />
                        {auditSearch && (
                          <button
                            type="button"
                            onClick={() => setAuditSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Liste des Événements du Journal d'Audit */}
                    <div className="space-y-3">
                      {(() => {
                        const filtered = auditEvents.filter(ev => {
                          if (auditFilter !== "all" && ev.category !== auditFilter) return false
                          if (auditSearch.trim()) {
                            const q = auditSearch.toLowerCase()
                            const matchActor = ev.executor?.username?.toLowerCase().includes(q)
                            const matchTarget = ev.target?.username?.toLowerCase().includes(q) || ev.target?.id?.includes(q)
                            const matchAction = ev.action?.toLowerCase().includes(q)
                            const matchReason = ev.reason?.toLowerCase().includes(q)
                            return matchActor || matchTarget || matchAction || matchReason
                          }
                          return true
                        })

                        if (filtered.length === 0) {
                          return (
                            <div className="rounded-3xl border border-white/5 bg-slate-900/40 py-16 text-center text-sm text-slate-400">
                              <span className="text-3xl block mb-2">📜</span>
                              {t("audit.noEvents")}
                            </div>
                          )
                        }

                        return filtered.map(ev => {
                          const badgeClass =
                            ev.badge === "danger"
                              ? "bg-rose-500/20 text-rose-300 ring-rose-500/30"
                              : ev.badge === "warning"
                              ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                              : ev.badge === "success"
                              ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30"
                              : "bg-indigo-500/20 text-indigo-300 ring-indigo-500/30"

                          const timeFormatted = new Date(ev.timestamp).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })

                          return (
                            <div
                              key={ev.id}
                              className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4 transition hover:border-white/10 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                {ev.executor?.avatar ? (
                                  <img
                                    src={ev.executor.avatar}
                                    alt={ev.executor.username}
                                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 shrink-0"
                                  />
                                ) : (
                                  <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-300 ring-2 ring-indigo-500/30 shrink-0">
                                    {(ev.executor?.username || "?").slice(0, 2).toUpperCase()}
                                  </div>
                                )}

                                <div className="space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-sm text-white">
                                      {ev.executor?.username || "Système"}
                                    </span>
                                    {ev.executor?.bot && (
                                      <span className="rounded bg-indigo-500/30 px-1.5 py-0.2 text-[10px] font-bold text-indigo-200">
                                        BOT
                                      </span>
                                    )}
                                    <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ${badgeClass}`}>
                                      {ev.action}
                                    </span>
                                    {ev.target && (
                                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                                        <span className="text-slate-500">→</span>
                                        {ev.target.avatar && (
                                          <img
                                            src={ev.target.avatar}
                                            alt=""
                                            className="h-4 w-4 rounded-full object-cover inline-block ring-1 ring-white/10"
                                          />
                                        )}
                                        <span className="font-semibold text-white">
                                          {ev.target.username || "Membre"}
                                        </span>
                                      </span>
                                    )}
                                  </div>

                                  {ev.reason && (
                                    <p className="text-xs text-slate-400 break-words">
                                      <span className="text-slate-500 font-medium">Motif :</span> {ev.reason}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 text-right sm:text-right">
                                <span className="font-mono text-xs text-slate-500">
                                  {timeFormatted}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      })()}
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

                {/* Section Minecraft & RCON */}
                {activeTab === "minecraft" && (
                  <MinecraftTab
                    config={config}
                    updateMinecraftField={updateMinecraftField}
                    guildId={id}
                    token={token}
                    apiBaseUrl={API_BASE_URL}
                    textChannels={textChannels}
                    roles={roles}
                  />
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
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, type: "role" })}
                    className={`rounded-xl border p-2 text-xs font-bold transition ${
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
                    className={`rounded-xl border p-2 text-xs font-bold transition ${
                      itemForm.type === "item"
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    📦 Objet Virtuel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setItemForm({
                        ...itemForm,
                        type: "minecraft",
                        minecraftCommand: itemForm.minecraftCommand || "give {player} diamond 5"
                      })
                    }
                    className={`rounded-xl border p-2 text-xs font-bold transition ${
                      itemForm.type === "minecraft"
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    ⛏️ Minecraft
                  </button>
                </div>
              </div>

              {itemForm.type === "minecraft" && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-300">
                      Commande Console Minecraft (RCON)
                    </label>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                      Variable : {"{player}"}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={itemForm.minecraftCommand || ""}
                    onChange={e => setItemForm({ ...itemForm, minecraftCommand: e.target.value })}
                    placeholder="Ex: give {player} diamond 10"
                    className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-slate-950 px-3.5 py-2 font-mono text-sm text-emerald-300 outline-none focus:border-emerald-400"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                    💡 La commande sera exécutée par la console de votre serveur Minecraft. <code className="text-emerald-300 font-mono">{"{player}"}</code> sera automatiquement remplacé par le pseudo Minecraft lié du membre (via <code className="text-indigo-300 font-mono">/link-mc</code>).
                  </p>
                </div>
              )}

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

      {/* Modal d'Ajout / Édition de Commande Personnalisée (Auto-Répondeur) */}
      {showCcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🤖</span>
                <span>{editingCc ? "Modifier le déclencheur" : "Nouveau Déclencheur"}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCcModal(false)
                  setEditingCc(null)
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  {t("cc.trigger")}
                </label>
                <input
                  type="text"
                  value={ccForm.trigger}
                  onChange={e => setCcForm(prev => ({ ...prev, trigger: e.target.value }))}
                  placeholder="ex: !ip, !site, salut"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  {t("cc.matchType")}
                </label>
                <select
                  value={ccForm.matchType}
                  onChange={e => setCcForm(prev => ({ ...prev, matchType: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="exact">{t("cc.matchExact")}</option>
                  <option value="startsWith">{t("cc.matchStartsWith")}</option>
                  <option value="contains">{t("cc.matchContains")}</option>
                </select>
              </div>

              {/* Format de réponse (Texte ou Embed) */}
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200">
                    {t("cc.isEmbed")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCcForm(prev => ({ ...prev, isEmbed: !prev.isEmbed }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      ccForm.isEmbed ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        ccForm.isEmbed ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {ccForm.isEmbed && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-slate-400">
                        {t("cc.embedTitle")}
                      </label>
                      <input
                        type="text"
                        value={ccForm.embedTitle}
                        onChange={e => setCcForm(prev => ({ ...prev, embedTitle: e.target.value }))}
                        placeholder="Titre de l'embed"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">
                        {t("cc.embedColor")}
                      </label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="color"
                          value={ccForm.embedColor}
                          onChange={e => setCcForm(prev => ({ ...prev, embedColor: e.target.value }))}
                          className="h-8 w-10 cursor-pointer rounded-lg border border-white/10 bg-slate-900 p-0.5"
                        />
                        <span className="text-[10px] font-mono text-slate-400">{ccForm.embedColor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  {t("cc.response")}
                </label>
                <textarea
                  rows={3}
                  value={ccForm.response}
                  onChange={e => setCcForm(prev => ({ ...prev, response: e.target.value }))}
                  placeholder="Bonjour {user}, notre site web est : https://monsite.fr"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="rounded-xl bg-indigo-500/10 p-2.5 text-[11px] text-indigo-300 font-medium">
                💡 {t("cc.tagsHelp")}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setShowCcModal(false)
                  setEditingCc(null)
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveCustomCommand}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
              >
                {editingCc ? "Mettre à jour" : "Créer le déclencheur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de consultation des candidatures */}
      {submissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📋</span>
                  <span>Candidatures : {submissionsModal.formTitle}</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Historique des réponses et décisions du staff pour ce formulaire.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionsModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {submissionsModal.loading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chargement des candidatures...
                </div>
              ) : submissionsModal.submissions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Aucune candidature enregistrée pour le moment.
                </div>
              ) : (
                submissionsModal.submissions.map(sub => {
                  const statusColors = {
                    PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/20",
                    ACCEPTED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
                    REJECTED: "bg-rose-500/10 text-rose-300 border-rose-500/20"
                  }
                  const statusLabels = {
                    PENDING: "⏳ En attente",
                    ACCEPTED: "✅ Acceptée",
                    REJECTED: "❌ Refusée"
                  }
                  return (
                    <div key={sub._id || sub.submissionId} className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                            {sub.userTag?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{sub.userTag || sub.userId}</div>
                            <div className="text-[10px] text-slate-500">
                              {sub.createdAt ? new Date(sub.createdAt).toLocaleString("fr-FR") : ""}
                            </div>
                          </div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusColors[sub.status] || statusColors.PENDING}`}>
                          {statusLabels[sub.status] || sub.status}
                          {sub.reviewedByTag && ` par ${sub.reviewedByTag}`}
                        </span>
                      </div>

                      {/* Réponses du candidat */}
                      <div className="space-y-2.5">
                        {Array.isArray(sub.answers) && sub.answers.map((ans, i) => (
                          <div key={i} className="rounded-xl bg-slate-900/80 p-3 text-xs">
                            <div className="font-semibold text-slate-300">{ans.question}</div>
                            <div className="mt-1 whitespace-pre-wrap text-slate-100">{ans.answer || "Non renseigné"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/10 p-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSubmissionsModal(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Fermer
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
      className={`shrink-0 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
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
