export default function ConnexionPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6">
      <section className="w-full max-w-md border border-[var(--line)] bg-white p-8">
        <p className="text-sm font-semibold text-[var(--brand)]">E-COMMERCE</p>
        <h1 className="mt-3 text-2xl font-semibold">Connexion</h1>
        <p className="mt-3 leading-6 text-[var(--muted)]">
          La connexion avec Carri Account sera activée lors de l’intégration OAuth.
        </p>
        <button
          className="mt-7 flex h-11 w-full items-center justify-center bg-[var(--brand)] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled
          type="button"
        >
          Se connecter avec Carri Account
        </button>
      </section>
    </main>
  );
}
