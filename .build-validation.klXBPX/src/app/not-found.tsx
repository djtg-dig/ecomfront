import Link from "next/link";
import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: noIndexRobots,
};

export default function NotFound() {
  return (
    <main className="page-shell grid place-items-center p-6 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Page introuvable</h1>
        <p className="mt-3 text-[var(--muted)]">Cette adresse ne correspond à aucune page du portail.</p>
        <Link className="button button-primary mt-6" href="/">
          Revenir à l’accueil
        </Link>
      </div>
    </main>
  );
}
