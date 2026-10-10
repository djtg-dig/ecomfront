"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-3 text-[var(--muted)]">Veuillez réessayer dans quelques instants.</p>
        <button className="mt-6 h-10 bg-[var(--brand)] px-4 text-sm font-semibold text-white" onClick={reset} type="button">
          Réessayer
        </button>
      </div>
    </main>
  );
}
