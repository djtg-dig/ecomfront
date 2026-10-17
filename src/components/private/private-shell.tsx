"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { BusinessPermissionsProvider, useBusinessPermissionsState } from "@/components/private/business-permissions-provider";
import { hasAnyPermission } from "@/lib/permissions/catalog";
const personalNavigation = [{ href: "/espace", label: "Accueil" }, { href: "/espace/entreprises", label: "Mes entreprises" }, { href: "/espace/invitations", label: "Invitations reçues" }, { href: "/espace/parametres", label: "Paramètres du compte" }];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/espace" && pathname.startsWith(`${href}/`));
}

export function PrivateShell({ children }: Readonly<{ children: ReactNode }>) {
  return <Suspense fallback={<PrivateShellFallback />}><PrivateShellContent>{children}</PrivateShellContent></Suspense>;
}

function PrivateShellFallback() {
  return <div aria-busy="true" className="grid min-h-64 place-items-center p-6"><p className="text-sm text-[var(--muted)]">Chargement de votre espace…</p></div>;
}

function PrivateShellContent({ children }: Readonly<{ children: ReactNode }>) {
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
  return <BusinessPermissionsProvider businessId={businessId}><BusinessShellNavigation businessId={businessId}>{children}</BusinessShellNavigation></BusinessPermissionsProvider>;
}

function BusinessShellNavigation({ businessId, children }: Readonly<{ businessId: string; children: ReactNode }>) {
  const permissionState = useBusinessPermissionsState();
  const permissions = permissionState?.permissions ?? null;
  const status = permissionState?.status ?? "loading";
  const navigation = [
    { href: `/espace/entreprises/${businessId}`, label: "Tableau de bord" },
    { href: "/espace", label: "Retour à mon espace" },
  ].concat(status === "ready" && permissions ? [
    ...(hasAnyPermission(permissions, ["PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "PRODUCT_DEACTIVATE", "PRODUCT_VARIANT_VIEW", "PRODUCT_VARIANT_CREATE", "PRODUCT_VARIANT_UPDATE"]) ? [{ href: `/espace/entreprises/${businessId}/produits`, label: "Produits" }] : []),
    ...(hasAnyPermission(permissions, ["INVENTORY_VIEW", "INVENTORY_INITIALIZE", "INVENTORY_IN", "INVENTORY_OUT", "INVENTORY_ADJUST", "INVENTORY_MOVEMENT_VIEW"]) ? [{ href: `/espace/entreprises/${businessId}/stocks`, label: "Stocks" }] : []),
    ...(permissions.some((permission) => permission.startsWith("PURCHASE_") || permission.startsWith("SUPPLIER_")) ? [{ href: `/espace/entreprises/${businessId}/achats`, label: "Achats" }] : []),
    ...(permissions.some((permission) => permission.startsWith("SALE_")) ? [{ href: `/espace/entreprises/${businessId}/ventes`, label: "Ventes" }] : []),
    ...(permissions.some((permission) => permission.startsWith("CUSTOMER_") || permission.startsWith("SUPPLIER_")) ? [{ href: `/espace/entreprises/${businessId}/partenaires`, label: "Partenaires commerciaux" }] : []),
    ...(permissions.some((permission) => ["FINANCIAL_SUMMARY_VIEW", "FINANCIAL_MOVEMENT_VIEW", "RECEIVABLE_VIEW", "RECEIVABLE_PAYMENT_VIEW", "RECEIVABLE_PAYMENT_CREATE", "SUPPLIER_PAYMENT_VIEW", "SUPPLIER_PAYMENT_CREATE", "SUPPLIER_PAYMENT_REVERSE"].includes(permission)) ? [{ href: `/espace/entreprises/${businessId}/finance`, label: "Finance" }] : []),
    ...(permissions.some((permission) => permission.startsWith("MEMBER_") || permission.startsWith("INVITATION_")) ? [{ href: `/espace/entreprises/${businessId}/membres`, label: "Membres et accès" }] : []),
  ] : []);
  return <ShellFrame navigation={navigation} title="Espace entreprise">{children}</ShellFrame>;
}
