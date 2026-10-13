"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { SiteFooter } from "@/components/layout/site-footer";
const personalNavigation = [{ href: "/espace", label: "Accueil" }, { href: "/espace/entreprises", label: "Mes entreprises" }, { href: "/espace/invitations", label: "Invitations reçues" }, { href: "/espace/parametres", label: "Paramètres du compte" }];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/espace" && pathname.startsWith(`${href}/`));
}

export function PrivateShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  return pathname.startsWith("/espace/entreprises/") ? <BusinessShell>{children}</BusinessShell> : <PersonalShell>{children}</PersonalShell>;
}

function ShellFrame({ children, navigation, title }: Readonly<{ children: ReactNode; navigation: { href: string; label: string }[]; title: string }>) {
  const pathname = usePathname();
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
              <p className="text-xs font-medium text-[var(--muted)]">{title}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="site-container flex flex-1 flex-col gap-6 py-6 lg:flex-row">
        <nav aria-label="Navigation privée" className="content-panel flex shrink-0 flex-wrap gap-2 p-3 lg:w-56 lg:flex-col lg:flex-nowrap">
          {navigation.map((item) => (
            <Link
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={isActive(pathname, item.href) ? "button button-primary" : "button button-outline"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

function PersonalShell({ children }: Readonly<{ children: ReactNode }>) { return <ShellFrame navigation={personalNavigation} title="Mon compte">{children}</ShellFrame>; }

function BusinessShell({ children }: Readonly<{ children: ReactNode }>) {
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [status, setStatus] = useState<"loading" | "forbidden" | "unavailable" | "ready">("loading");
  useEffect(() => { let active = true; setStatus("loading"); setPermissions(null); fetch(`/api/private/businesses/${businessId}/my-permissions`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => { if (!active) return; if (!response.ok) return setStatus(response.status === 403 || response.status === 401 ? "forbidden" : "unavailable"); const data = await response.json() as { permissions: string[] }; setPermissions(data.permissions); setStatus("ready"); }).catch(() => active && setStatus("unavailable")); return () => { active = false; }; }, [businessId]);
  const navigation = [
    { href: `/espace/entreprises/${businessId}`, label: "Tableau de bord" },
    { href: "/espace", label: "Retour à mon espace" },
  ].concat(status === "ready" && permissions ? [
    ...(permissions.some(p => ["VIEW_CATALOG", "MANAGE_CATALOG"].includes(p)) ? [{ href: `/espace/entreprises/${businessId}/produits`, label: "Produits" }] : []),
    ...(permissions.some(p => ["VIEW_INVENTORY", "MANAGE_INVENTORY"].includes(p)) ? [{ href: `/espace/entreprises/${businessId}/stocks`, label: "Stocks" }] : []),
    ...(permissions.some(p => ["VIEW_PURCHASES", "MANAGE_PURCHASES"].includes(p)) ? [{ href: `/espace/entreprises/${businessId}/achats`, label: "Achats" }] : []),
    ...(permissions.some(p => ["VIEW_SALES", "MANAGE_SALES", "USE_POS"].includes(p)) ? [{ href: `/espace/entreprises/${businessId}/ventes`, label: "Ventes" }] : []),
    ...(permissions.some(p => ["VIEW_FINANCIAL_SUMMARY", "VIEW_RECEIVABLES", "MANAGE_RECEIVABLES"].includes(p)) ? [{ href: `/espace/entreprises/${businessId}/finance`, label: "Finance" }] : []),
    ...(permissions.some(p => ["VIEW_MEMBERS", "MANAGE_MEMBERS"].includes(p)) ? [{ href: `/espace/entreprises/${businessId}/membres`, label: "Membres et accès" }] : []),
  ] : []);
  return <ShellFrame navigation={navigation} title="Espace entreprise">{children}</ShellFrame>;
}
