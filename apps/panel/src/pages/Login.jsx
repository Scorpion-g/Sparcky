import { useEffect, useMemo } from "react"
import { Navigate, useLocation, Link } from "react-router-dom"
import { clearTokenFromUrl, getJwt, getTokenFromUrl, setJwt } from "../lib/auth"
import { useLanguage, LanguageSelector } from "../lib/i18n"

const API_BASE_URL = ""

function DiscordIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495a18.29 18.29 0 0 0-5.4872 0 12.63 12.63 0 0 0-.6177-1.2495.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.3196 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561 19.9 19.9 0 0 0 5.9937 3.0304.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057 13.2012 13.2012 0 0 1-1.8722-.8923.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.793 8.18 1.793 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.0991.246.1981.372.2924a.077.077 0 0 1-.0066.1276 12.299 12.299 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698 0 0 1-1.2252 1.9932.076.076 0 0 0 .0842.0286 19.8582 19.8582 0 0 0 6.0023-3.0304.077.077 0 0 0 .0313-.0552c.5004-5.177.838-9.6739-2.9215-13.6606a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.183 0-2.1569-1.0874-2.1569-2.419 0-1.3316.9555-2.419 2.157-2.419 1.2108 0 2.1757 1.096 2.1568 2.419 0 1.3316-.9555 2.419-2.1569 2.419Zm7.9748 0c-1.183 0-2.1569-1.0874-2.1569-2.419 0-1.3316.9555-2.419 2.1569-2.419 1.2108 0 2.1757 1.096 2.1568 2.419 0 1.3316-.9468 2.419-2.1568 2.419Z" />
    </svg>
  )
}

export default function Login() {
  const { t } = useLanguage()
  const location = useLocation()

  const existingJwt = useMemo(() => getJwt(), [])
  const urlToken = useMemo(() => getTokenFromUrl(location.search), [location.search])
  const isExchanging = Boolean(urlToken)

  useEffect(() => {
    if (!urlToken) return

    setJwt(urlToken)
    clearTokenFromUrl()

    // On laisse la route protégée faire le reste, mais on évite le flash.
    window.location.replace("/dashboard")
  }, [urlToken])

  if (existingJwt && !isExchanging) return <Navigate to="/dashboard" replace />

  const discordAuthUrl = `${API_BASE_URL}/auth/discord`

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between">
      {/* Top Bar avec Sélecteur de Langue */}
      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-black bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
          God_Sparky
        </Link>
        <LanguageSelector />
      </header>

      <div className="mx-auto flex flex-1 items-center justify-center px-4 py-8 w-full max-w-6xl">
        <div className="relative w-full max-w-md">
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-indigo-500/40 via-sky-500/30 to-fuchsia-500/30 blur" />

          <div className="relative rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <DiscordIcon className="h-7 w-7 text-indigo-200" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
                <p className="mt-1 text-sm text-slate-300">
                  {t("login.subtitle")}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <a
                href={discordAuthUrl}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <DiscordIcon className="h-5 w-5 opacity-90 transition group-hover:opacity-100" />
                <span>{t("login.btnDiscord")}</span>
              </a>

              <Link
                to="/demo"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500/80 hover:bg-indigo-950/40 px-4 py-3 text-sm font-semibold text-indigo-300 hover:text-white transition shadow-lg shadow-indigo-950/40"
              >
                <span>🎮</span>
                <span>{t("login.btnDemo")}</span>
              </Link>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-400">{t("login.oauthSecure")}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p className="font-medium text-slate-200">{t("login.tipTitle")}</p>
                <p className="mt-1">
                  {t("login.tipText")} <span className="font-mono">{API_BASE_URL || window.location.origin}</span>.
                </p>
              </div>

              {isExchanging && (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>{t("login.connecting")}</span>
                </div>
              )}
            </div>

            <p className="mt-8 text-center text-xs text-slate-400">
              {t("login.termsNotice")}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-4 text-center text-xs text-slate-500 space-x-4">
        <Link to="/terms" className="hover:underline">{t("demo.footerTerms", "Conditions d'Utilisation")}</Link>
        <Link to="/privacy" className="hover:underline">{t("demo.footerPrivacy", "Politique de Confidentialité")}</Link>
        <Link to="/demo" className="hover:underline text-indigo-400">Sandbox Démo</Link>
      </footer>
    </div>
  )
}
