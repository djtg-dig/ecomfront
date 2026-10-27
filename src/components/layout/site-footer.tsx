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
  if (variant === "private") {
    return <footer className="site-footer site-footer-private mt-auto shrink-0"><div className="site-container flex flex-col gap-2 py-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Carri Business</p><div className="flex flex-wrap gap-x-4 gap-y-2"><Link className="footer-link" href="/conditions-generales">{locale === "en" ? "Terms" : "Conditions générales"}</Link><Link className="footer-link" href="/confidentialite">{locale === "en" ? "Privacy" : "Confidentialité"}</Link></div></div></footer>;
  }
  return (
    <footer className="site-footer site-footer-public mt-auto shrink-0">
      <div className="site-container grid gap-6 py-6 text-sm md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Link className="text-base font-semibold text-[var(--ink)]" href="/">Carri Business</Link>
          <p className="mt-2 max-w-md leading-6 text-[var(--muted)]">
            {locale === "en" ? "A platform to manage your company’s commercial activities." : "Une plateforme pour gérer les activités commerciales de votre entreprise."}
          </p>
        </div>
        {localizedSections.map((section) => <nav aria-label={section.title} key={section.title}><h2 className="font-semibold text-[var(--ink)]">{section.title}</h2><ul className="mt-3 grid gap-2">{section.links.map((link) => <li key={link.href}>{link.external ? <a className="footer-link" href={link.href} rel="noopener noreferrer" target="_blank">{link.label}</a> : <Link className="footer-link" href={link.href}>{link.label}</Link>}</li>)}</ul></nav>)}
        <p className="md:col-span-4 text-[var(--muted)]">© {new Date().getFullYear()} Carri Business</p>
      </div>
    </footer>
  );
}
