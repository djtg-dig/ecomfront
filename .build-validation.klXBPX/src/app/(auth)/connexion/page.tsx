import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { noIndexRobots } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Connexion",
  robots: noIndexRobots,
};

const authenticationErrors: Record<string, string> = {
  configuration_locale: "La connexion n'est pas configurée sur ce serveur.",
  configuration_https: "La connexion sécurisée exige HTTPS entre les services.",
  origine_invalide: "La demande de connexion n'est pas autorisée.",
  oauth_login_csrf_detected: "La tentative de connexion a expiré. Recommencez.",
  oauth_state_invalid_or_expired: "La tentative de connexion a expiré. Recommencez.",
  oauth_configuration_unavailable: "Le service de connexion est indisponible.",
  oauth_provider_unavailable: "Carri Account est temporairement indisponible.",
  oauth_authorization_denied: "La connexion a été annulée.",
  oauth_proof_invalid: "La preuve de connexion est invalide. Recommencez.",
  oauth_callback_invalid: "Le retour de connexion est invalide. Recommencez.",
  handoff_delivery_origin_invalid: "La livraison de connexion n'est pas autorisée.",
  handoff_delivery_context_invalid: "La requête du navigateur n'a pas pu être vérifiée.",
  handoff_delivery_binding_invalid: "La liaison de connexion est invalide. Recommencez.",
  handoff_delivery_destination_not_allowed: "La destination de connexion n'est pas autorisée.",
  handoff_missing: "La preuve de connexion est manquante. Recommencez.",
  handoff_invalid: "La preuve de connexion est invalide. Recommencez.",
  handoff_expired: "La preuve de connexion a expiré. Recommencez.",
  handoff_already_consumed: "Cette preuve a déjà été utilisée. Recommencez.",
  handoff_client_not_authorized: "Le service de connexion n'est pas autorisé.",
  handoff_delivery_failed: "La livraison sécurisée a échoué. Recommencez.",
  session_expired: "Votre session a expiré. Reconnectez-vous.",
};

export default function ConnexionPage({ searchParams }: {
  searchParams: Promise<{ erreur?: string }>;
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
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
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
        <a className="button button-primary mt-7 flex w-full" href="/api/auth/carri/login">
          Se connecter avec Carri Account
        </a>
        <Link className="mt-5 inline-flex text-sm text-[var(--muted)] underline underline-offset-4" href="/">
          Retour à l’accueil
        </Link>
      </section>
    </main>
  );
}
