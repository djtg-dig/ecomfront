import Link from "next/link";
import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: noIndexRobots,
};

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6 text-center">
      <div>
        <p className="text-sm font-semibold text-[var(--brand)]">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page introuvable</h1>
        <p className="mt-3 text-[var(--muted)]">Cette adresse ne correspond à aucune page du portail.</p>
        <Link className="mt-6 inline-flex h-10 items-center bg-[var(--brand)] px-4 text-sm font-semibold text-white" href="/">
          Revenir à l’accueil
        </Link>
      </div>
    </main>
  );
}
