import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link className="flex items-center gap-3 font-semibold" href="/">
            <span className="grid size-8 place-items-center bg-[var(--brand)] text-sm font-bold text-white">
              E
            </span>
            E-commerce
          </Link>
          <span className="text-sm text-[var(--muted)]">Portail sécurisé</span>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl content-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold text-[var(--brand)]">GESTION COMMERCIALE</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Votre activité, organisée avec clarté.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Le portail E-commerce prépare un espace de travail fiable pour piloter
            votre commerce et vos équipes.
          </p>
          <button
            className="mt-8 inline-flex h-11 items-center justify-center bg-[var(--brand)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
            disabled
            type="button"
          >
            Se connecter avec Carri Account
          </button>
          <p className="mt-3 text-sm text-[var(--muted)]">
            La connexion sécurisée sera disponible à la prochaine étape.
          </p>
        </div>

        <aside className="border-l-4 border-[var(--accent)] bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold text-[var(--ink)]">Un accès pensé pour les équipes</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Les espaces Entreprises, invitations et administration seront connectés
            progressivement via le serveur applicatif.
          </p>
        </aside>
      </section>
    </main>
  );
}
