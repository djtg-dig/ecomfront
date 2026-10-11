"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-secondary)]">Une erreur est survenue</h1>
        <p className="mt-3 text-[var(--muted)]">Veuillez réessayer dans quelques instants.</p>
        <button className="button button-primary mt-6" onClick={reset} type="button">
          Réessayer
        </button>
      </div>
    </main>
  );
}
