"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { PrivateBusinessProvider, usePrivateBusiness } from "@/components/private/private-business-context";

const mainNavigation = [
  { href: "/espace", label: "Vue d’ensemble" },
  { href: "/espace/entreprises", label: "Entreprises" },
];

const businessNavigation = [
  { segment: "membres", label: "Membres" },
  { segment: "produits", label: "Produits" },
  { segment: "stocks", label: "Stocks" },
  { segment: "achats", label: "Achats" },
  { segment: "ventes", label: "Ventes" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/espace" && pathname.startsWith(`${href}/`));
}

export function PrivateShell({ children }: Readonly<{ children: ReactNode }>) {
  return <PrivateBusinessProvider><PrivateShellContent>{children}</PrivateShellContent></PrivateBusinessProvider>;
}

function PrivateShellContent({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const { state, selecting, selectBusiness } = usePrivateBusiness();
  const businesses = state.kind === "ready" ? state.overview.businesses : [];
  const selectedBusinessId = state.kind === "ready" ? state.overview.selectedBusinessId : null;
  const selectedBusiness = businesses.find((business) => business.public_id === selectedBusinessId) ?? null;

  return (
    <div className="page-shell min-h-screen">
      <header className="site-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link className="brand-lockup flex items-center gap-3 font-semibold" href="/espace">
            <span className="brand-mark grid size-8 place-items-center text-sm font-bold">E</span>
            E-commerce
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-[var(--muted)]">Entreprise active</p>
              <p className="max-w-48 truncate text-sm font-semibold" title={selectedBusiness?.name}>{selectedBusiness?.name ?? "Non sélectionnée"}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row">
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
          <div className="w-full border-t pt-3 lg:mt-1">
            <label className="sr-only" htmlFor="private-business-selector">Entreprise active</label>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              disabled={state.kind !== "ready" || selecting || businesses.length === 0}
              id="private-business-selector"
              onChange={(event) => void selectBusiness(event.target.value)}
              value={selectedBusinessId ?? ""}
            >
              <option value="">{state.kind === "loading" ? "Chargement…" : businesses.length ? "Choisir une entreprise" : "Aucune entreprise"}</option>
              {businesses.map((business) => <option key={business.public_id} value={business.public_id}>{business.name}</option>)}
            </select>
          </div>
          {selectedBusiness ? <div className="flex w-full flex-wrap gap-2 lg:flex-col">
            <p className="w-full px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Modules</p>
            {businessNavigation.map((item) => {
              const href = `/espace/entreprises/${selectedBusiness.public_id}/${item.segment}`;
              return <Link aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "button button-primary" : "button button-outline"} href={href} key={item.segment}>{item.label}</Link>;
            })}
          </div> : <p className="w-full px-2 text-xs leading-5 text-[var(--muted)]">Sélectionnez une entreprise pour accéder aux modules.</p>}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
