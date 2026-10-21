"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { BusinessNameProvider, useBusinessNameState } from "@/components/private/business-name-provider";
import { BusinessPermissionsProvider, useBusinessPermissionsState } from "@/components/private/business-permissions-provider";
import { hasAnyPermission } from "@/lib/permissions/catalog";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLocale } from "@/components/i18n/locale-provider";

type NavigationItem = { href: string; label: string; secondary?: boolean };

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

function ShellFrame({ children, navigation, title, mobileSection }: Readonly<{ children: ReactNode; navigation: NavigationItem[]; title: string; mobileSection: string }>) {
  const pathname = usePathname();
  return (
    <div className="page-shell flex min-h-dvh flex-col">
      <header className="site-header shrink-0">
        <div className="site-container flex flex-wrap items-center justify-between gap-4 py-3">
          <Link aria-label="Retour à l’accueil" className="brand-lockup hidden items-center gap-3 font-semibold md:flex" href="/">
            <span className="brand-mark grid size-8 place-items-center text-sm font-bold">E</span>
            E-commerce
          </Link>
          <div className="hidden items-center justify-between gap-3 md:flex">
            <div className="min-w-0 sm:text-right">
              <p className="text-xs font-medium text-[var(--muted)]">{title}</p>
            </div>
            <LanguageSelector persistPreference />
            <LogoutButton />
          </div>
          <MobileNavigation key={pathname} mobileSection={mobileSection} navigation={navigation} pathname={pathname} title={title} />
        </div>
      </header>
      <div className="site-container flex flex-1 flex-col gap-6 py-6 md:flex-row">
        <nav aria-label="Navigation privée" className="content-panel order-3 flex w-full hidden shrink-0 flex-wrap gap-2 p-3 md:order-none md:flex md:w-56 md:flex-col md:flex-nowrap">
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
        <main className="min-w-0 flex-1"><div>{children}</div></main>
      </div>
      <SiteFooter />
    </div>
  );
}

function MobileNavigation({ mobileSection, navigation, pathname, title }: { mobileSection: string; navigation: NavigationItem[]; pathname: string; title: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") return close();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const focusTimer = window.requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }));
    return () => { window.cancelAnimationFrame(focusTimer); document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; document.body.style.paddingRight = previousPaddingRight; if (button?.isConnected) button.focus({ preventScroll: true }); };
  }, [open]);
  const primaryNavigation = navigation.filter((item) => !item.secondary);
  const secondaryNavigation = navigation.filter((item) => item.secondary);
  return <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
    <Link aria-label="Retour à l’accueil" className="brand-mark grid size-8 shrink-0 place-items-center text-sm font-bold" href="/" onClick={close}>E</Link>
    <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>{title}</p>
    <button aria-controls="private-mobile-navigation" aria-expanded={open} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} className="button button-outline grid min-h-11 min-w-11 shrink-0 place-items-center px-3" onClick={() => setOpen((current) => !current)} ref={buttonRef} type="button">
      <span aria-hidden="true" className="text-xl leading-none">{open ? "×" : "☰"}</span>
    </button>
    {open ? <div className="fixed inset-0 z-50" role="presentation">
      <button aria-label="Fermer le menu" className="absolute inset-0 bg-black/30" onClick={close} type="button" />
      <aside aria-label="Navigation privée mobile" aria-modal="true" className="absolute right-0 top-0 flex h-full w-[min(20rem,calc(100vw-1rem))] flex-col overflow-y-auto bg-[var(--background)] p-5 shadow-2xl" id="private-mobile-navigation" ref={panelRef} role="dialog">
        <div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate text-sm font-semibold">{title}</p><button aria-label="Fermer le menu" className="button button-outline min-h-11 min-w-11 shrink-0 px-3" onClick={close} ref={closeButtonRef} type="button">×</button></div>
        <p className="mt-5 text-xs font-medium text-[var(--muted)]">{mobileSection}</p>
        <nav className="mt-2 grid gap-2" aria-label="Navigation mobile">{primaryNavigation.map((item) => <Link aria-current={isActive(pathname, item.href) ? "page" : undefined} className={isActive(pathname, item.href) ? "button button-primary" : "button button-outline"} href={item.href} key={item.href} onClick={close}>{item.label}</Link>)}</nav>
        {secondaryNavigation.length ? <div className="mt-5 border-t border-[var(--line)] pt-4">{secondaryNavigation.map((item) => <Link aria-current={isActive(pathname, item.href) ? "page" : undefined} className="button button-outline w-full" href={item.href} key={item.href} onClick={close}>← {item.label}</Link>)}</div> : null}
        <div className="mt-4 border-t border-[var(--line)] pt-4"><LogoutButton /></div>
      </aside>
    </div> : null}
  </div>;
}

function PersonalShell({ children }: Readonly<{ children: ReactNode }>) {
  const { locale, t } = useLocale();
  const navigation: NavigationItem[] = [{ href: "/espace", label: t("navigation", "home") }, { href: "/espace/entreprises", label: t("navigation", "businesses") }, { href: "/espace/invitations", label: t("navigation", "invitations") }, { href: "/espace/parametres", label: t("navigation", "settings") }];
  return <ShellFrame mobileSection={locale === "en" ? "MY ACCOUNT" : "MON COMPTE"} navigation={navigation} title={locale === "en" ? "My account" : "Mon compte"}>{children}</ShellFrame>;
}

function BusinessShell({ children }: Readonly<{ children: ReactNode }>) {
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;
  return <BusinessPermissionsProvider businessId={businessId}><BusinessNameProvider businessId={businessId}><BusinessShellNavigation businessId={businessId}>{children}</BusinessShellNavigation></BusinessNameProvider></BusinessPermissionsProvider>;
}

function BusinessShellNavigation({ businessId, children }: Readonly<{ businessId: string; children: ReactNode }>) {
  const { t } = useLocale();
  const permissionState = useBusinessPermissionsState();
  const businessState = useBusinessNameState();
  const permissions = permissionState?.permissions ?? null;
  const status = permissionState?.status ?? "loading";
  const navigation: NavigationItem[] = [
    { href: `/espace/entreprises/${businessId}`, label: t("navigation", "dashboard") },
    { href: "/espace", label: t("navigation", "backToWorkspace"), secondary: true },
  ].concat(status === "ready" && permissions ? [
    ...(hasAnyPermission(permissions, ["PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "PRODUCT_DEACTIVATE", "PRODUCT_VARIANT_VIEW", "PRODUCT_VARIANT_CREATE", "PRODUCT_VARIANT_UPDATE"]) ? [{ href: `/espace/entreprises/${businessId}/produits`, label: t("navigation", "products") }] : []),
    ...(hasAnyPermission(permissions, ["INVENTORY_VIEW", "INVENTORY_INITIALIZE", "INVENTORY_IN", "INVENTORY_OUT", "INVENTORY_ADJUST", "INVENTORY_MOVEMENT_VIEW"]) ? [{ href: `/espace/entreprises/${businessId}/stocks`, label: t("navigation", "inventory") }] : []),
    ...(permissions.some((permission) => permission.startsWith("PURCHASE_") || permission.startsWith("SUPPLIER_")) ? [{ href: `/espace/entreprises/${businessId}/achats`, label: t("navigation", "purchases") }] : []),
    ...(permissions.some((permission) => permission.startsWith("SALE_")) ? [{ href: `/espace/entreprises/${businessId}/ventes`, label: t("navigation", "sales") }] : []),
    ...(permissions.some((permission) => permission.startsWith("CUSTOMER_") || permission.startsWith("SUPPLIER_")) ? [{ href: `/espace/entreprises/${businessId}/partenaires`, label: t("navigation", "partners") }] : []),
    ...(permissions.some((permission) => ["FINANCIAL_SUMMARY_VIEW", "FINANCIAL_MOVEMENT_VIEW", "RECEIVABLE_VIEW", "RECEIVABLE_PAYMENT_VIEW", "RECEIVABLE_PAYMENT_CREATE", "SUPPLIER_PAYMENT_VIEW", "SUPPLIER_PAYMENT_CREATE", "SUPPLIER_PAYMENT_REVERSE"].includes(permission)) ? [{ href: `/espace/entreprises/${businessId}/finance`, label: t("navigation", "finance") }] : []),
    ...(permissions.some((permission) => permission.startsWith("MEMBER_") || permission.startsWith("INVITATION_") || permission === "BUSINESS_UPDATE") ? [{ href: `/espace/entreprises/${businessId}/parametres`, label: t("navigation", "businessSettings") }] : []),
  ] : []);
  return <ShellFrame mobileSection="ESPACE ENTREPRISE" navigation={navigation} title={businessState?.business?.name ?? "Espace entreprise"}>{children}</ShellFrame>;
}
