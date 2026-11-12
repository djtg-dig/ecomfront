"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

export function SiteFooter({ variant }: Readonly<{ variant: "public" | "private" }>) {
  const { locale, t } = useLocale();
  const sections = [
    { title: t("navigation", "marketplace"), links: [{ href: "/", label: t("navigation", "home") }, { href: "/recherche", label: t("navigation", "marketplace") }] },
    { title: locale === "en" ? "Company" : "Entreprise", links: [{ href: "/fonctionnalites", label: t("navigation", "features") }, { href: "/tarifs", label: t("navigation", "pricing") }, { href: "/connexion", label: t("navigation", "workspace") }, { href: "https://kisinet.com", label: "Kisinet", external: true }] },
    { title: locale === "en" ? "Legal information" : "Informations légales", links: [{ href: "/conditions-generales", label: locale === "en" ? "Terms and conditions" : "Conditions générales" }, { href: "/confidentialite", label: locale === "en" ? "Privacy" : "Confidentialité" }, { href: "/cookies", label: "Cookies" }] },
    { title: locale === "en" ? "Support" : "Assistance", links: [{ href: "/fonctionnalites", label: locale === "en" ? "Help center" : "Centre d’aide" }, { href: "/contact", label: t("navigation", "contact") }] },
  ];
  const description = locale === "en" ? "A neutral marketplace for discovering products from independent stores." : "Une marketplace neutre pour découvrir les produits de boutiques indépendantes.";
  return <footer className={`site-footer ${variant === "private" ? "site-footer-private" : "site-footer-public"} mt-auto shrink-0`}><div className="site-container py-10 sm:py-14"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))]"><div><Link aria-label="Carri Business — accueil" className="brand-lockup" href="/"><span className="brand-wordmark"><span>Carri</span> Business</span></Link><p className="mt-4 max-w-xs text-sm leading-6 text-[var(--muted)]">{description}</p></div>{sections.map((section) => <nav aria-label={section.title} key={section.title}><h2 className="text-sm font-semibold text-[var(--ink)]">{section.title}</h2><ul className="mt-4 grid gap-3 text-sm">{section.links.map((link) => <li key={link.href}>{"external" in link && link.external ? <a className="footer-link" href={link.href} rel="noopener noreferrer" target="_blank">{link.label}</a> : <Link className="footer-link" href={link.href}>{link.label}</Link>}</li>)}</ul></nav>)}</div><div className="mt-10 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">© {new Date().getFullYear()} Carri Business · {locale === "en" ? "All rights reserved." : "Tous droits réservés."}</div></div></footer>;
}
