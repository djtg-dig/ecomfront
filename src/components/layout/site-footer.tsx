"use client";

import Link from "next/link";

const links = [
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return <footer className="site-footer mt-auto"><div className="site-container flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-[var(--muted)]"><p>© {new Date().getFullYear()} E-commerce</p><nav aria-label="Liens de pied de page"><ul className="flex flex-wrap gap-x-5 gap-y-2">{links.map((link) => <li key={link.href}><Link className="nav-link" href={link.href}>{link.label}</Link></li>)}</ul></nav></div></footer>;
}
