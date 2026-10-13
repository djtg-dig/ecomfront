"use client";

import Link from "next/link";

const sections = [
  { title: "Nos plateformes", links: [{ href: "/", label: "E-commerce" }, { href: "https://kisinet.com", label: "Kisinet", external: true }] },
  { title: "Informations légales", links: [{ href: "/conditions-generales", label: "Conditions générales" }, { href: "/confidentialite", label: "Confidentialité" }, { href: "/cookies", label: "Cookies" }] },
  { title: "Assistance", links: [{ href: "/fonctionnalites", label: "Centre d’aide" }, { href: "/contact", label: "Nous contacter" }] },
];

export function SiteFooter() {
  return (
    <footer className="site-footer mt-auto">
      <div className="site-container grid gap-8 py-10 text-sm md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Link className="text-base font-semibold text-white" href="/">Carri Business</Link>
          <p className="mt-2 max-w-md leading-6 text-white/85">
            Une plateforme pour gérer les activités commerciales de votre entreprise.
          </p>
        </div>
        {sections.map((section) => <nav aria-label={section.title} key={section.title}><h2 className="font-semibold text-white">{section.title}</h2><ul className="mt-3 grid gap-2">{section.links.map((link) => <li key={link.href}>{link.external ? <a className="footer-link" href={link.href} rel="noopener noreferrer" target="_blank">{link.label}</a> : <Link className="footer-link" href={link.href}>{link.label}</Link>}</li>)}</ul></nav>)}
        <p className="md:col-span-4 text-white/80">© {new Date().getFullYear()} Carri Business</p>
      </div>
    </footer>
  );
}
