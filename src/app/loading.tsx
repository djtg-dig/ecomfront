/**
 * Next instantiates the root loading boundary while prerendering its synthetic
 * global-error route, before RootLayout can mount LocaleBoundary. Keep this
 * fallback independent from the locale context; the bilingual label remains usable for
 * both supported locales during that early rendering phase.
 */
export default function Loading() {
  return (
    <main aria-busy="true" className="grid min-h-screen place-items-center bg-[var(--surface)]">
      <p className="text-sm font-medium text-[var(--muted)]">
        <span lang="fr">Chargement…</span>
        <span aria-hidden="true"> / </span>
        <span lang="en">Loading…</span>
      </p>
    </main>
  );
}
