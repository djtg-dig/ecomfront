"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { PrivateBusinessProvider, usePrivateBusiness } from "@/components/private/private-business-context";

const mainNavigation = [
  { href: "/espace", label: "Tableau de bord" },
  { href: "/espace/entreprises", label: "Entreprises" },
  { href: "/espace/parametres", label: "Paramètres" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/espace" && pathname.startsWith(`${href}/`));
}

export function PrivateShell({ children }: Readonly<{ children: ReactNode }>) {
  return <PrivateBusinessProvider><PrivateShellContent>{children}</PrivateShellContent></PrivateBusinessProvider>;
}

function PrivateShellContent({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const { state } = usePrivateBusiness();
  const selectedBusiness = state.kind === "ready"
    ? state.overview.businesses.find((business) => business.public_id === state.overview.selectedBusinessId) ?? null
    : null;

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <header className="site-header">
        <div className="site-container flex flex-wrap items-center justify-between gap-4 py-3">
          <Link className="brand-lockup flex items-center gap-3 font-semibold" href="/espace">
            <span className="brand-mark grid size-8 place-items-center text-sm font-bold">E</span>
            E-commerce
          </Link>
          <div className="order-3 flex w-full items-center justify-between gap-3 border-t border-[var(--line)] pt-3 sm:order-none sm:w-auto sm:border-0 sm:pt-0">
            <div className="min-w-0 sm:text-right">
              <p className="text-xs font-medium text-[var(--muted)]">Entreprise active</p>
              <p className="max-w-48 truncate text-sm font-semibold" title={selectedBusiness?.name}>{selectedBusiness?.name ?? "Non sélectionnée"}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="site-container flex flex-1 flex-col gap-6 py-6 lg:flex-row">
        <nav aria-label="Navigation privée" className="content-panel flex shrink-0 flex-wrap gap-2 p-3 lg:w-56 lg:flex-col lg:flex-nowrap">
          {mainNavigation.map((item) => (
            <Link
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={isActive(pathname, item.href) ? "button button-primary" : "button button-outline"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          {selectedBusiness ? <p className="w-full px-2 text-xs leading-5 text-[var(--muted)]">Les modules seront affichés après confirmation des permissions effectives par le backend.</p> : <p className="w-full px-2 text-xs leading-5 text-[var(--muted)]">Sélectionnez une entreprise dans les paramètres pour accéder aux modules.</p>}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
