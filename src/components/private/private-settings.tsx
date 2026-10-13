import Link from "next/link";

export function PrivateSettings() {
  return <main><p className="eyebrow">MON COMPTE</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Paramètres du compte</h1><section className="content-panel mt-6 p-6"><h2 className="text-xl font-semibold">Compte personnel</h2><p className="mt-3 text-sm text-[var(--muted)]">Les informations d’identité et la session sont gérées de manière sécurisée par Carri Account.</p></section><section className="content-panel mt-6 p-6"><h2 className="text-xl font-semibold">Espaces entreprises</h2><p className="mt-3 text-sm text-[var(--muted)]">Créez ou ouvrez un espace entreprise depuis la liste de vos entreprises. Le choix d’une entreprise n’est jamais global à votre compte.</p><Link className="button button-outline mt-5" href="/espace/entreprises">Mes entreprises</Link></section></main>;
}
