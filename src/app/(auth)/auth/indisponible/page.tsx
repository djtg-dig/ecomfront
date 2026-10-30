"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

export default function AuthenticationUnavailablePage() {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const [retrying, setRetrying] = useState(false);
  const english = locale === "en";
  const requestedReturn = searchParams.get("retour");
  const returnTo = requestedReturn?.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : null;
  const retryHref = returnTo ? `/api/auth/carri/login?retour=${encodeURIComponent(returnTo)}` : "/api/auth/carri/login";
  return <main className="page-shell grid place-items-center p-6"><section className="content-panel w-full max-w-md p-8 text-center"><p className="eyebrow">E-COMMERCE</p><h1 className="mt-3 text-2xl font-semibold text-[var(--brand-secondary)]">{english ? "Sign-in temporarily unavailable" : "Connexion temporairement indisponible"}</h1><p className="mt-4 leading-6 text-[var(--muted)]">{english ? "We can't sign you in right now. Our authentication service is temporarily unavailable." : "Nous ne pouvons pas vous connecter à votre compte pour le moment. Notre service d'authentification rencontre une difficulté temporaire."}</p><p className="mt-3 text-sm text-[var(--muted)]">{english ? "Please try again in a few moments." : "Veuillez réessayer dans quelques instants."}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><a aria-busy={retrying} className={`button button-primary${retrying ? " pointer-events-none opacity-60" : ""}`} href={retryHref} onClick={() => setRetrying(true)}>{retrying ? (english ? "Trying again…" : "Nouvelle tentative…") : (english ? "Try again" : "Réessayer")}</a><Link className="button button-outline" href="/">{english ? "Back to home" : "Retour à l'accueil"}</Link></div></section></main>;
}
