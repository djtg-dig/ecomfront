"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

export default function AuthenticationUnavailablePage() {
  const { locale } = useLocale();
  const english = locale === "en";
  return <main className="page-shell grid place-items-center p-6"><section className="content-panel w-full max-w-md p-8 text-center"><p className="eyebrow">E-COMMERCE</p><h1 className="mt-3 text-2xl font-semibold text-[var(--brand-secondary)]">{english ? "Sign-in temporarily unavailable" : "Connexion temporairement indisponible"}</h1><p className="mt-4 leading-6 text-[var(--muted)]">{english ? "We can't sign you in right now. Our authentication service is temporarily unavailable." : "Nous ne pouvons pas vous connecter à votre compte pour le moment. Notre service d'authentification rencontre une difficulté temporaire."}</p><p className="mt-3 text-sm text-[var(--muted)]">{english ? "Please try again in a few moments." : "Veuillez réessayer dans quelques instants."}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link className="button button-primary" href="/api/auth/carri/login">{english ? "Try again" : "Réessayer"}</Link><Link className="button button-outline" href="/">{english ? "Back to home" : "Retour à l'accueil"}</Link></div></section></main>;
}
