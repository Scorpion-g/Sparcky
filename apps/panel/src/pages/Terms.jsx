import { Link } from "react-router-dom"
import { LanguageSelector, useLanguage } from "../lib/i18n"

export default function Terms() {
  const { lang } = useLanguage()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-white">God_Sparky</span>
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
              Terms of Service
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
              {lang === "fr" ? "Conditions Générales d'Utilisation" : lang === "es" ? "Términos del Servicio" : "Terms of Service"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {lang === "fr" ? "Dernière mise à jour : 10 Novembre 2026" : "Last updated: November 10, 2026"}
            </p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-300">
            <section>
              <h2 className="text-base font-bold text-white mb-2">1. Introduction</h2>
              <p>
                {lang === "fr"
                  ? "En invitant ou en utilisant God_Sparky ainsi que son panneau de contrôle en ligne (sparcky.matteoriviere.fr), vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation ainsi que par les Conditions d'utilisation de Discord."
                  : "By inviting or using God_Sparky and its online dashboard (sparcky.matteoriviere.fr), you agree to be bound by these Terms of Service and Discord's Developer Terms of Service."}
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">2. Utilisation du Service & Éligibilité</h2>
              <p>
                {lang === "fr"
                  ? "God_Sparky fournit des services de modération, d'économie virtuelle, de billetterie (tickets) et de divertissement. L'utilisation du bot est interdite pour toute activité illégale, harcèlement, spam ou violation des directives communautaires de Discord."
                  : "God_Sparky provides moderation, virtual economy, ticket systems, and engagement tools. You agree not to use the bot for illegal activities, harassment, spam, or any violation of Discord's Community Guidelines."}
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">3. Monnaie Virtuelle & Économie</h2>
              <p>
                {lang === "fr"
                  ? "Les pièces, articles de boutique et récompenses d'expérience (XP) sont strictement virtuels et n'ont aucune valeur monétaire dans le monde réel. Ils ne peuvent être ni échangés contre de l'argent réel, ni remboursés."
                  : "Coins, shop items, and experience points (XP) are strictly virtual and hold no real-world monetary value. They cannot be exchanged for fiat currency or refunded."}
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">4. Disponibilité & Mises à Jour</h2>
              <p>
                {lang === "fr"
                  ? "Nous nous efforçons de maintenir le bot et le panel disponibles 24/7. Cependant, des interruptions de maintenance planifiées ou imprévues peuvent survenir. Nous nous réservons le droit de modifier ou d'interrompre certaines fonctionnalités."
                  : "We strive to keep the service operational 24/7. However, scheduled or emergency maintenance may occur. We reserve the right to modify or discontinue features at any time."}
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">5. Contact</h2>
              <p>
                {lang === "fr"
                  ? "Pour toute question concernant ces conditions, rejoignez notre serveur Discord de support ou contactez l'équipe d'administration."
                  : "For any questions regarding these terms, please contact the developer team through our official Discord support server."}
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
