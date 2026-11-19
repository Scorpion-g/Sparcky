import React, { useState } from "react"

export default function MinecraftTab({
  config,
  updateMinecraftField,
  guildId,
  token,
  apiBaseUrl,
  textChannels = []
}) {
  const mc = config?.minecraft || {
    enabled: false,
    ip: "",
    port: 25565,
    name: "Serveur Minecraft",
    bedrock: false,
    statusChannelId: null,
    rconEnabled: false,
    rconPort: 25575,
    rconPassword: ""
  }

  // États pour les tests en direct
  const [testingPing, setTestingPing] = useState(false)
  const [pingResult, setPingResult] = useState(null) // { success: boolean, data?: any, error?: string }

  const [testingRcon, setTestingRcon] = useState(false)
  const [rconTestResult, setRconTestResult] = useState(null) // { success: boolean, output?: string, error?: string }

  // États pour la console web RCON
  const [rconCommand, setRconCommand] = useState("")
  const [rconExecuting, setRconExecuting] = useState(false)
  const [consoleHistory, setConsoleHistory] = useState([
    { type: "system", text: "Console RCON prête. Tapez une commande Minecraft (ex: list, say Bonjour, whitelist list)." }
  ])

  // Test de ping public (Server List Ping)
  async function handleTestPing() {
    let rawIp = (mc.ip || "").trim().replace(/^https?:\/\//i, "").split("/")[0]
    let targetPort = mc.port || 25565

    if (rawIp.includes(":")) {
      const parts = rawIp.split(":")
      rawIp = parts[0].trim()
      const p = parseInt(parts[1], 10)
      if (!isNaN(p) && p > 0) {
        targetPort = p
        updateMinecraftField("port", p)
      }
      updateMinecraftField("ip", rawIp)
    }

    if (!rawIp) {
      setPingResult({ success: false, error: "Veuillez renseigner une adresse IP valide." })
      return
    }

    setTestingPing(true)
    setPingResult(null)

    const jwtToken = token || localStorage.getItem("jwt") || ""

    try {
      const res = await fetch(`${apiBaseUrl}/api/guilds/${guildId}/minecraft/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {})
        },
        body: JSON.stringify({
          ip: rawIp,
          port: targetPort,
          bedrock: Boolean(mc.bedrock)
        })
      })

      const data = await res.json()
      if (res.ok && data.online) {
        setPingResult({ success: true, data })
      } else {
        setPingResult({
          success: false,
          error: data.error || "Serveur injoignable (éteint ou mauvaise édition Java/Bedrock)."
        })
      }
    } catch (err) {
      setPingResult({ success: false, error: err.message || "Erreur réseau." })
    } finally {
      setTestingPing(false)
    }
  }

  // Test de connexion RCON
  async function handleTestRcon() {
    let rawIp = (mc.ip || "").trim().replace(/^https?:\/\//i, "").split("/")[0]
    if (rawIp.includes(":")) {
      rawIp = rawIp.split(":")[0].trim()
    }

    if (!rawIp) {
      setRconTestResult({ success: false, error: "Adresse IP manquante." })
      return
    }

    setTestingRcon(true)
    setRconTestResult(null)

    const jwtToken = token || localStorage.getItem("jwt") || ""

    try {
      const res = await fetch(`${apiBaseUrl}/api/guilds/${guildId}/minecraft/test-rcon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {})
        },
        body: JSON.stringify({
          ip: rawIp,
          rconPort: mc.rconPort || 25575,
          rconPassword: mc.rconPassword || undefined
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setRconTestResult({ success: true, output: data.output })
        setConsoleHistory(prev => [
          ...prev,
          { type: "system", text: `[Connexion RCON validée] Réponse du serveur: ${data.output}` }
        ])
      } else {
        setRconTestResult({ success: false, error: data.error || "Échec de l'authentification RCON." })
      }
    } catch (err) {
      setRconTestResult({ success: false, error: err.message || "Erreur de connexion RCON." })
    } finally {
      setTestingRcon(false)
    }
  }

  // Exécution d'une commande dans la console RCON
  async function handleExecuteRcon(e) {
    if (e) e.preventDefault()
    const cmd = rconCommand.trim()
    if (!cmd || rconExecuting) return

    setRconExecuting(true)
    setRconCommand("")

    // Ajoute la commande envoyée à l'historique
    setConsoleHistory(prev => [...prev, { type: "input", text: `> /${cmd.replace(/^\//, "")}` }])

    try {
      const res = await fetch(`${apiBaseUrl}/api/guilds/${guildId}/minecraft/rcon-exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ command: cmd })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setConsoleHistory(prev => [
          ...prev,
          { type: "output", text: data.output || "(Succès sans retour texte)" }
        ])
      } else {
        setConsoleHistory(prev => [
          ...prev,
          { type: "error", text: `❌ Erreur: ${data.error || "Impossible d'exécuter la commande."}` }
        ])
      }
    } catch (err) {
      setConsoleHistory(prev => [
        ...prev,
        { type: "error", text: `❌ Erreur réseau: ${err.message}` }
      ])
    } finally {
      setRconExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête Principal */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⛏️</span>
              <h2 className="text-xl font-bold text-white">Intégration Minecraft & Console RCON</h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Liez votre serveur Minecraft à Discord sans aucun plugin ni modification de code.
              Les joueurs peuvent utiliser <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-400">/mcstatus</code> et vous pouvez contrôler la console RCON.
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center shrink-0">
            <input
              type="checkbox"
              checked={Boolean(mc.enabled)}
              onChange={e => updateMinecraftField("enabled", e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-7 w-12 rounded-full bg-slate-800 transition-colors after:absolute after:left-[4px] after:top-[4px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus:outline-none" />
          </label>
        </div>
      </div>

      {/* Section 1 : Configuration Publique */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>🌐</span> Informations Publiques du Serveur Minecraft
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Ces informations sont utilisées par le bot pour vérifier si le serveur est en ligne et compter les joueurs connectés.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Nom du serveur */}
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nom d'affichage</label>
            <input
              type="text"
              placeholder="ex: Uchronie, Survie SMP"
              value={mc.name || ""}
              onChange={e => updateMinecraftField("name", e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type d'édition */}
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Édition du jeu</label>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  updateMinecraftField("bedrock", false)
                  if (mc.port === 19132) updateMinecraftField("port", 25565)
                }}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                  !mc.bedrock
                    ? "border-emerald-500/50 bg-emerald-600/20 text-emerald-300"
                    : "border-white/5 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                ☕ Java Edition
              </button>
              <button
                type="button"
                onClick={() => {
                  updateMinecraftField("bedrock", true)
                  if (mc.port === 25565 || !mc.port) updateMinecraftField("port", 19132)
                }}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                  mc.bedrock
                    ? "border-emerald-500/50 bg-emerald-600/20 text-emerald-300"
                    : "border-white/5 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                📱 Bedrock (PE)
              </button>
            </div>
          </div>

          {/* Adresse IP / Domaine */}
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Adresse IP ou Domaine</label>
            <input
              type="text"
              placeholder="ex: 45.147.96.24 ou play.monserveur.fr"
              value={mc.ip || ""}
              onChange={e => updateMinecraftField("ip", e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Port du jeu */}
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Port du Serveur</label>
            <input
              type="number"
              placeholder="25565"
              value={mc.port ?? 25565}
              onChange={e => updateMinecraftField("port", Number(e.target.value) || 25565)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Bouton de test Ping */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={handleTestPing}
            disabled={testingPing || !mc.ip}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {testingPing ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Vérification en cours...</span>
              </>
            ) : (
              <>
                <span>📡</span>
                <span>Tester le Statut Public</span>
              </>
            )}
          </button>

          {pingResult && (
            <div className={`rounded-xl border p-3 text-xs flex items-center gap-3 ${
              pingResult.success
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                : "border-rose-500/30 bg-rose-950/40 text-rose-300"
            }`}>
              {pingResult.success ? (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    <strong>En ligne !</strong> {pingResult.data.players.online}/{pingResult.data.players.max} joueurs • {pingResult.data.version} ({pingResult.data.latency}ms)
                  </span>
                </>
              ) : (
                <>
                  <span>⚠️</span>
                  <span><strong>Hors ligne :</strong> {pingResult.error}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 2 : Configuration RCON */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="text-base font-bold text-white">Console Distante RCON</h3>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                Optionnel
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Permet à vos administrateurs d'exécuter des commandes (/rcon sur Discord ou ci-dessous) sans accès SSH.
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center shrink-0">
            <input
              type="checkbox"
              checked={Boolean(mc.rconEnabled)}
              onChange={e => updateMinecraftField("rconEnabled", e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-800 transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-focus:outline-none" />
          </label>
        </div>

        {/* Notice Sécurité */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-200 flex items-start gap-3">
          <span className="text-base">🔒</span>
          <div>
            <strong>Sécurité Renforcée :</strong> Votre mot de passe RCON est chiffré en <strong>AES-256-GCM</strong> dans notre base de données. Il n'est jamais renvoyé en clair au navigateur.
          </div>
        </div>

        {mc.rconEnabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Port RCON */}
              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Port RCON</label>
                <input
                  type="number"
                  placeholder="25575"
                  value={mc.rconPort ?? 25575}
                  onChange={e => updateMinecraftField("rconPort", Number(e.target.value) || 25575)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Mot de passe RCON */}
              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mot de Passe RCON</label>
                  {mc.hasRconPassword && (
                    <span className="text-[11px] font-semibold text-emerald-400">✓ Enregistré</span>
                  )}
                </div>
                <input
                  type="password"
                  placeholder={mc.hasRconPassword ? "•••••••• (Laisser vide pour ne pas modifier)" : "Mot de passe défini dans server.properties"}
                  value={mc.rconPassword || ""}
                  onChange={e => updateMinecraftField("rconPassword", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Bouton Test RCON */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={handleTestRcon}
                disabled={testingRcon || !mc.ip}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white border border-white/10 transition hover:bg-slate-700 disabled:opacity-50"
              >
                {testingRcon ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Test RCON en cours...</span>
                  </>
                ) : (
                  <>
                    <span>🔑</span>
                    <span>Tester la Connexion RCON</span>
                  </>
                )}
              </button>

              {rconTestResult && (
                <div className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
                  rconTestResult.success
                    ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                    : "border-rose-500/30 bg-rose-950/40 text-rose-300"
                }`}>
                  {rconTestResult.success ? (
                    <>
                      <span>✅</span>
                      <span><strong>RCON Connecté :</strong> {rconTestResult.output}</span>
                    </>
                  ) : (
                    <>
                      <span>❌</span>
                      <span><strong>Échec :</strong> {rconTestResult.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Section 3 : Mini Console RCON Interactive */}
            <div className="border-t border-white/10 pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>💻</span> Console Interactive en Direct
                </h4>
                <button
                  type="button"
                  onClick={() => setConsoleHistory([{ type: "system", text: "Console nettoyée." }])}
                  className="text-[11px] text-slate-500 hover:text-slate-300"
                >
                  Effacer l'historique
                </button>
              </div>

              {/* Écran Terminal */}
              <div className="h-52 overflow-y-auto rounded-2xl border border-white/10 bg-black/90 p-4 font-mono text-xs space-y-1.5 shadow-inner">
                {consoleHistory.map((item, index) => (
                  <div key={index} className="leading-relaxed">
                    {item.type === "input" && (
                      <span className="text-amber-400 font-semibold">{item.text}</span>
                    )}
                    {item.type === "output" && (
                      <span className="text-emerald-400">{item.text}</span>
                    )}
                    {item.type === "system" && (
                      <span className="text-slate-500 italic">{item.text}</span>
                    )}
                    {item.type === "error" && (
                      <span className="text-rose-400 font-semibold">{item.text}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Barre de saisie de commande */}
              <form onSubmit={handleExecuteRcon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tapez une commande (ex: list, say Bonjour, whitelist list, kick Steve)..."
                  value={rconCommand}
                  onChange={e => setRconCommand(e.target.value)}
                  disabled={rconExecuting}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={rconExecuting || !rconCommand.trim()}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50 shrink-0"
                >
                  {rconExecuting ? "Envoi..." : "Envoyer"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
