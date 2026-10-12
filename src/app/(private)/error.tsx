"use client";

export default function PrivateError({ reset }: { reset: () => void }) {
  return <div className="grid min-h-64 place-items-center p-6"><section className="content-panel max-w-md p-8" role="alert"><h1 className="text-xl font-semibold text-[var(--brand-secondary)]">Espace temporairement indisponible</h1><p className="mt-3 text-sm text-[var(--muted)]">Veuillez réessayer dans quelques instants.</p><button className="button button-primary mt-6" onClick={reset} type="button">Réessayer</button></section></div>;
}
