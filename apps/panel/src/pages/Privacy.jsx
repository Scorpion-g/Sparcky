import { Link } from "react-router-dom"
import { LanguageSelector, useLanguage } from "../lib/i18n"

export default function Privacy() {
  const { lang } = useLanguage()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-white">God_Sparky</span>
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              Privacy Policy
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link
              to="/dashboard"
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-xl space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              {lang === "fr" ? "Politique de Confidentialité" : lang === "es" ? "Política de Privacidad" : "Privacy Policy"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {lang === "fr" ? "Dernière mise à jour : 10 Novembre 2026" : "Last updated: November 10, 2026"}
            </p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-300">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. Données Collectées</h2>
              <p>
                {lang === "fr"
                  ? "God_Sparky ne collecte que les informations strictement nécessaires à son fonctionnement : identifiants Discord publics (User ID, Guild ID, Channel ID, Role ID), soldes de pièces virtuelles, niveaux d'expérience et historiques d'avertissements (warns)."
                  : "God_Sparky only collects data strictly necessary for bot operations: public Discord IDs (User ID, Guild ID, Channel ID, Role ID), virtual economy balances, experience levels, and warning logs."}
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Contenu des Messages</h2>
              <p>
                {lang === "fr"
                  ? "Le contenu des messages n'est analysé qu'en mémoire vive (RAM) pour les fonctions d'auto-modération (anti-spam, anti-liens, mots interdits) et n'est jamais stocké de manière permanente dans nos bases de données."
                  : "Message content is only inspected in-memory (RAM) for real-time moderation features (anti-spam, anti-links, bad words filtering) and is never permanently stored in our databases."}
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. Partage des Données</h2>
              <p>
                {lang === "fr"
                  ? "Aucune donnée personnelle n'est vendue, louée ou partagée avec des tiers à des fins commerciales ou publicitaires."
                  : "No personal data is ever sold, rented, or shared with third parties for marketing or advertising purposes."}
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. Suppression des Données & RGPD</h2>
              <p>
                {lang === "fr"
                  ? "Tout propriétaire de serveur ou utilisateur Discord peut demander la suppression intégrale de ses données enregistrées en contactant le support ou en expulsant le bot du serveur."
                  : "Server owners or users can request immediate and full deletion of their stored records by contacting our support team or removing the bot from their server."}
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
