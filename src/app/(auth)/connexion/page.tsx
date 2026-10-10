import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Connexion",
  robots: noIndexRobots,
};

export default function ConnexionPage() {
  return (
    <main className="page-shell grid place-items-center p-6">
      <section className="content-panel w-full max-w-md p-8">
        <p className="eyebrow">E-COMMERCE</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--brand-secondary)]">Connexion</h1>
        <p className="mt-3 leading-6 text-[var(--muted)]">
          La connexion avec Carri Account sera activée lors de l’intégration OAuth.
        </p>
        <button
          className="button button-primary mt-7 flex w-full"
          disabled
          type="button"
        >
          Se connecter avec Carri Account
        </button>
      </section>
    </main>
  );
}
