"use client";

/**
 * This fallback can render when the root layout and its providers have failed.
 * It must therefore stay independent from application contexts, including i18n.
 */
export default function GlobalError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <html lang="fr"><body className="page-shell grid min-h-screen place-items-center p-6 text-center"><main><h1 className="text-2xl font-semibold text-[var(--brand-secondary)]">Une erreur est survenue</h1><p className="mt-3 text-[var(--muted)]">Veuillez réessayer dans quelques instants.</p><button className="button button-primary mt-6" onClick={reset} type="button">Réessayer</button></main></body></html>;
}
