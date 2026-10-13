"use client";

import Link from "next/link";

const links = [
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer mt-auto">
      <div className="site-container grid gap-6 py-8 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-base font-semibold text-white">E-commerce</p>
          <p className="mt-2 max-w-md leading-6 text-white/85">
            Gérez vos entreprises, vos ventes et vos opérations depuis un espace unique.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:items-end">
          <nav aria-label="Liens de pied de page">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
              {links.map((link) => (
                <li key={link.href}>
                  <Link className="footer-link" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-white/80">© {new Date().getFullYear()} E-commerce</p>
        </div>
      </div>
    </footer>
  );
}
