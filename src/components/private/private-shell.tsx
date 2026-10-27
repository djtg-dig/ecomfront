"use client";

import { type ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, Building2, FileText, Handshake, LayoutDashboard, Package, Receipt, Settings, ShoppingCart, Truck, WalletCards, Warehouse } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { PrivateMobileNavigation, PrivateSidebarNavigation, type PrivateNavigationItem } from "@/components/private/private-navigation";
import { BusinessNameProvider, useBusinessNameState } from "@/components/private/business-name-provider";
import { BusinessPermissionsProvider, useBusinessPermissionsState } from "@/components/private/business-permissions-provider";
import { hasAnyPermission } from "@/lib/permissions/catalog";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLocale } from "@/components/i18n/locale-provider";

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

function ShellFrame({ children, navigation, title, mobileSection }: Readonly<{ children: ReactNode; navigation: PrivateNavigationItem[]; title: string; mobileSection: string }>) {
  const pathname = usePathname();
  return (
    <div className="page-shell flex min-h-dvh flex-col">
      <header className="site-header shrink-0">
        <div className="site-container flex flex-wrap items-center justify-between gap-4 py-3">
          <Link aria-label="Retour à l’accueil" className="brand-lockup hidden items-center gap-3 font-semibold md:flex" href="/">
            <span className="brand-mark grid size-9 place-items-center rounded-xl text-sm font-bold shadow-sm">E</span>
            <span>E-commerce <span className="block text-xs font-medium text-[var(--muted)]">Business Suite</span></span>
          </Link>
          <div className="hidden items-center justify-between gap-3 md:flex">
            <div className="min-w-0 sm:text-right">
              <p className="text-xs font-medium text-[var(--muted)]">{title}</p>
            </div>
            <LanguageSelector persistPreference />
            <LogoutButton />
          </div>
          <PrivateMobileNavigation key={pathname} mobileSection={mobileSection} navigation={navigation} pathname={pathname} title={title} />
        </div>
      </header>
      <div className="site-container flex flex-1 flex-col gap-6 py-6 md:flex-row">
        <PrivateSidebarNavigation navigation={navigation} pathname={pathname} />
        <main className="min-w-0 flex-1"><div>{children}</div></main>
      </div>
      <SiteFooter variant="private" />
    </div>
  );
}

function PersonalShell({ children }: Readonly<{ children: ReactNode }>) {
  const { locale, t } = useLocale();
  const navigation: PrivateNavigationItem[] = [{ href: "/espace", label: t("navigation", "home"), icon: LayoutDashboard }, { href: "/espace/entreprises", label: t("navigation", "businesses"), icon: Building2 }, { href: "/espace/invitations", label: t("navigation", "invitations"), icon: Handshake }, { href: "/espace/parametres", label: t("navigation", "settings"), icon: Settings }];
  return <ShellFrame mobileSection={locale === "en" ? "MY ACCOUNT" : "MON COMPTE"} navigation={navigation} title={locale === "en" ? "My account" : "Mon compte"}>{children}</ShellFrame>;
}

function BusinessShell({ children }: Readonly<{ children: ReactNode }>) {
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;
  return <BusinessPermissionsProvider businessId={businessId}><BusinessNameProvider businessId={businessId}><BusinessShellNavigation businessId={businessId}>{children}</BusinessShellNavigation></BusinessNameProvider></BusinessPermissionsProvider>;
}

function BusinessShellNavigation({ businessId, children }: Readonly<{ businessId: string; children: ReactNode }>) {
  const { locale, t } = useLocale();
  const permissionState = useBusinessPermissionsState();
  const businessState = useBusinessNameState();
  const permissions = permissionState?.permissions ?? null;
  const status = permissionState?.status ?? "loading";
  const navigation: PrivateNavigationItem[] = ([
    { href: `/espace/entreprises/${businessId}`, label: t("navigation", "dashboard"), icon: LayoutDashboard, section: locale === "en" ? "GENERAL" : "GÉNÉRAL" },
  ] as PrivateNavigationItem[]).concat(status === "ready" && permissions ? [
    ...(hasAnyPermission(permissions, ["PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "PRODUCT_DEACTIVATE", "PRODUCT_VARIANT_VIEW", "PRODUCT_VARIANT_CREATE", "PRODUCT_VARIANT_UPDATE"]) ? [{ href: `/espace/entreprises/${businessId}/produits`, label: t("navigation", "products"), icon: Package, section: locale === "en" ? "CATALOG AND INVENTORY" : "CATALOGUE ET STOCKS" }] : []),
    ...(hasAnyPermission(permissions, ["INVENTORY_VIEW", "INVENTORY_INITIALIZE", "INVENTORY_IN", "INVENTORY_OUT", "INVENTORY_ADJUST", "INVENTORY_MOVEMENT_VIEW"]) ? [{ href: `/espace/entreprises/${businessId}/stocks`, label: t("navigation", "inventory"), icon: Warehouse, section: locale === "en" ? "CATALOG AND INVENTORY" : "CATALOGUE ET STOCKS" }] : []),
    ...(permissions.some((permission) => permission.startsWith("PURCHASE_") || permission.startsWith("SUPPLIER_")) ? [{ href: `/espace/entreprises/${businessId}/achats`, label: t("navigation", "purchases"), icon: Truck, section: locale === "en" ? "COMMERCIAL OPERATIONS" : "OPÉRATIONS COMMERCIALES" }] : []),
    ...(["SALE_VIEW", "SALE_CREATE", "SALE_LINE_CREATE", "SALE_COMPLETE"].every((permission) => permissions.includes(permission)) ? [{ href: `/espace/entreprises/${businessId}/caisse`, label: t("navigation", "pos"), icon: ShoppingCart, section: locale === "en" ? "COMMERCIAL OPERATIONS" : "OPÉRATIONS COMMERCIALES" }] : []),
    ...(permissions.some((permission) => permission.startsWith("SALE_")) ? [{ href: `/espace/entreprises/${businessId}/ventes`, label: t("navigation", "sales"), icon: Receipt, section: locale === "en" ? "COMMERCIAL OPERATIONS" : "OPÉRATIONS COMMERCIALES" }] : []),
    ...(permissions.some((permission) => permission.startsWith("INVOICE_")) ? [{ href: `/espace/entreprises/${businessId}/factures`, label: t("navigation", "invoices"), icon: FileText, section: locale === "en" ? "COMMERCIAL OPERATIONS" : "OPÉRATIONS COMMERCIALES" }] : []),
    ...(permissions.some((permission) => permission.startsWith("CUSTOMER_") || permission.startsWith("SUPPLIER_")) ? [{ href: `/espace/entreprises/${businessId}/partenaires`, label: t("navigation", "partners"), icon: Handshake, section: locale === "en" ? "MANAGEMENT" : "GESTION" }] : []),
    ...(permissions.some((permission) => ["FINANCIAL_SUMMARY_VIEW", "FINANCIAL_MOVEMENT_VIEW", "RECEIVABLE_VIEW", "RECEIVABLE_UPDATE", "RECEIVABLE_PAYMENT_VIEW", "RECEIVABLE_PAYMENT_CREATE", "INVOICE_PAYMENT_CREATE", "SUPPLIER_PAYMENT_VIEW", "SUPPLIER_PAYMENT_CREATE", "SUPPLIER_PAYMENT_REVERSE"].includes(permission)) ? [{ href: `/espace/entreprises/${businessId}/finance`, label: t("navigation", "finance"), icon: WalletCards, section: locale === "en" ? "MANAGEMENT" : "GESTION" }] : []),
    ...(permissions.some((permission) => permission.startsWith("MEMBER_") || permission.startsWith("INVITATION_") || permission === "BUSINESS_UPDATE") ? [{ href: `/espace/entreprises/${businessId}/parametres`, label: t("navigation", "businessSettings"), icon: Settings, section: "ADMINISTRATION" }] : []),
  ] : [], [
    { href: "/espace", label: t("navigation", "backToWorkspace"), icon: ArrowLeft, secondary: true },
  ]);
  return <ShellFrame mobileSection="ESPACE ENTREPRISE" navigation={navigation} title={businessState?.business?.name ?? "Espace entreprise"}>{children}</ShellFrame>;
}
