"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

const sections = [
  { title: "Nos plateformes", links: [{ href: "/", label: "E-commerce" }, { href: "https://kisinet.com", label: "Kisinet", external: true }] },
  { title: "Informations légales", links: [{ href: "/conditions-generales", label: "Conditions générales" }, { href: "/confidentialite", label: "Confidentialité" }, { href: "/cookies", label: "Cookies" }] },
  { title: "Assistance", links: [{ href: "/fonctionnalites", label: "Centre d’aide" }, { href: "/contact", label: "Nous contacter" }] },
];

export function SiteFooter({ variant }: Readonly<{ variant: "public" | "private" }>) {
  const { locale } = useLocale();
  const localizedSections = locale === "en" ? [
    { title: "Our platforms", links: [{ href: "/", label: "E-commerce" }, { href: "https://kisinet.com", label: "Kisinet", external: true }] },
    { title: "Legal information", links: [{ href: "/conditions-generales", label: "Terms and conditions" }, { href: "/confidentialite", label: "Privacy" }, { href: "/cookies", label: "Cookies" }] },
    { title: "Support", links: [{ href: "/fonctionnalites", label: "Help center" }, { href: "/contact", label: "Contact us" }] },
  ] : sections;
  const variantClass = variant === "private" ? "site-footer-private" : "site-footer-public";

  return (
    <footer className={`site-footer ${variantClass} mt-auto shrink-0`}>
      <div className="site-container py-8 sm:py-10">
        <div className="grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Link aria-label="Accueil Carri Business" className="inline-flex items-center gap-3 text-base font-semibold text-[var(--ink)]" href="/">
            <span aria-hidden="true" className="brand-mark grid size-9 place-items-center rounded-xl text-sm font-bold">E</span>
            Carri Business
          </Link>
          <p className="mt-2 max-w-md leading-6 text-[var(--muted)]">
            {locale === "en" ? "A platform to manage your company’s commercial activities." : "Une plateforme pour gérer les activités commerciales de votre entreprise."}
          </p>
        </div>
        {localizedSections.map((section) => <nav aria-label={section.title} key={section.title}><h2 className="font-semibold text-[var(--ink)]">{section.title}</h2><ul className="mt-3 grid gap-2">{section.links.map((link) => <li key={link.href}>{link.external ? <a className="footer-link" href={link.href} rel="noopener noreferrer" target="_blank">{link.label}</a> : <Link className="footer-link" href={link.href}>{link.label}</Link>}</li>)}</ul></nav>)}
        </div>
        <div className="mt-8 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">© {new Date().getFullYear()} Carri Business · {locale === "en" ? "All rights reserved." : "Tous droits réservés."}</div>
      </div>
    </footer>
  );
}
