import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConnectionStatus } from "@/components/auth/connection-status";
import { authenticationErrors } from "@/lib/auth/login-errors";
import { noIndexRobots } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Connexion",
  robots: noIndexRobots,
};

export default function ConnexionPage({ searchParams }: {
  searchParams: Promise<{ erreur?: string; retour?: string }>;
}) {
  return (
    <Suspense fallback={
      <main className="page-shell grid min-h-screen place-items-center p-6">
        <p className="text-sm text-[var(--muted)]" aria-live="polite">Chargement de la connexion…</p>
      </main>
    }>
      <ConnexionContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ConnexionContent({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; retour?: string }>;
}) {
  const { erreur, retour } = await searchParams;
  const errorMessage = erreur ? authenticationErrors[erreur] : undefined;

  return (
    <main className="page-shell grid place-items-center p-6">
      <section className="content-panel w-full max-w-md p-8">
        <p className="eyebrow">E-COMMERCE</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--brand-secondary)]">Connexion</h1>
        <p className="mt-3 leading-6 text-[var(--muted)]">
          Accédez à votre espace avec votre compte Carri Account.
        </p>
        {errorMessage ? (
          <p className="mt-6 rounded-md border border-[var(--error)]/30 bg-white p-3 text-sm text-[var(--error)]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <ConnectionStatus />
        <a className="button button-primary mt-7 flex w-full" href={retour ? `/api/auth/carri/login?retour=${encodeURIComponent(retour)}` : "/api/auth/carri/login"}>
          Se connecter avec Carri Account
        </a>
        <Link className="mt-5 inline-flex text-sm text-[var(--muted)] underline underline-offset-4" href="/">
          Retour à l’accueil
        </Link>
      </section>
    </main>
  );
}
