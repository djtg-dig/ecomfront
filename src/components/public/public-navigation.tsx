"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLocale } from "@/components/i18n/locale-provider";
import { LogoutButton } from "@/components/auth/logout-button";
import { useAuthSession } from "@/components/auth/auth-session-provider";

export function PublicNavigation({ isAuthenticated }: Readonly<{ isAuthenticated: boolean }>) {
  const { t } = useLocale();
  const pathname = usePathname();
  const { state } = useAuthSession();
  const authenticated = state === "authenticated" || (state === "loading" && isAuthenticated);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const menuButton = menuButtonRef.current;
    const scrollPosition = window.scrollY;
    const previousStyles = {
      left: document.body.style.left,
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      position: document.body.style.position,
      right: document.body.style.right,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const closeOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") return closeMenu();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", closeOnKeyDown);
    // `position: fixed` conserve la position aussi sur iOS, où overflow seul ne bloque pas toujours le geste tactile.
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const focusTimer = window.requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }));

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", closeOnKeyDown);
      Object.assign(document.body.style, previousStyles);
      window.scrollTo({ left: 0, top: scrollPosition, behavior: "instant" });
      if (menuButton?.isConnected) menuButton.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    closeMenu();
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) closeMenu();
    };
    desktopQuery.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  const navigation = [
    { href: "/", label: t("navigation", "home") },
    { href: "/recherche", label: t("navigation", "marketplace") },
    { href: "/fonctionnalites", label: t("navigation", "features") },
    { href: "/tarifs", label: t("navigation", "pricing") },
    { href: "/contact", label: t("navigation", "contact") },
  ];
  return <div className="flex items-center gap-2">
    <Link aria-label={t("navigation", "cart")} className="header-icon-link" href="/compte/paniers"><ShoppingBag aria-hidden="true" size={19} /><span className="sr-only">{t("navigation", "cart")}</span></Link>
    {authenticated ? <div className="relative hidden lg:block"><button aria-expanded={accountOpen} aria-haspopup="menu" className="account-trigger" onClick={() => setAccountOpen((value) => !value)} type="button"><UserRound aria-hidden="true" size={18} /><span>{t("navigation", "account")}</span></button>{accountOpen ? <div className="account-menu" role="menu"><Link href="/messages" onClick={() => setAccountOpen(false)} role="menuitem">{t("navigation", "messages")}</Link><Link href="/espace" onClick={() => setAccountOpen(false)} role="menuitem">{t("navigation", "workspace")}</Link><Link href="/espace/parametres" onClick={() => setAccountOpen(false)} role="menuitem">{t("navigation", "settings")}</Link><div className="border-t border-[var(--line)] pt-2"><LogoutButton /></div></div> : null}</div> : <Link className="button button-primary hidden min-h-10 lg:inline-flex" href="/connexion">{t("navigation", "login")}</Link>}
    <button aria-controls="public-mobile-navigation" aria-expanded={open} aria-label={open ? t("navigation", "closeMenu") : t("navigation", "openMenu")} className="button button-outline min-h-11 min-w-11 px-3 lg:hidden" onClick={() => setOpen((value) => !value)} ref={menuButtonRef} type="button">{open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}</button>
    <nav aria-label={t("navigation", "home")} className="hidden lg:block"><ul className="flex items-center gap-5 text-sm">{navigation.map((item) => <li key={item.href}><Link className="nav-link" href={item.href}>{item.label}</Link></li>)}<li><LanguageSelector /></li></ul></nav>
    {open ? <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button aria-label={t("navigation", "closeMenu")} className="absolute inset-0 bg-black/30" onClick={closeMenu} type="button" />
      <aside aria-label={t("navigation", "home")} aria-modal="true" className="public-mobile-menu absolute inset-x-3 top-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] flex max-h-[calc(100dvh-0.75rem-env(safe-area-inset-bottom))] flex-col overflow-y-auto overscroll-contain" id="public-mobile-navigation" ref={panelRef} role="dialog">
        <div className="flex items-center justify-end pb-3"><button aria-label={t("navigation", "closeMenu")} className="button button-outline min-h-11 min-w-11 px-3" onClick={closeMenu} ref={closeButtonRef} type="button"><X aria-hidden="true" size={20} /></button></div>
        <nav aria-label={t("navigation", "home")}><ul className="grid gap-1">{navigation.map((item) => <li key={item.href}><Link className="mobile-nav-link" href={item.href} onClick={closeMenu}>{item.label}</Link></li>)}</ul></nav>
        <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4"><Link className="mobile-nav-link" href="/compte/paniers" onClick={closeMenu}>{t("navigation", "cart")}</Link>{authenticated ? <><Link className="mobile-nav-link" href="/messages" onClick={closeMenu}>{t("navigation", "messages")}</Link><Link className="mobile-nav-link" href="/espace" onClick={closeMenu}>{t("navigation", "workspace")}</Link><Link className="mobile-nav-link" href="/espace/parametres" onClick={closeMenu}>{t("navigation", "settings")}</Link><LogoutButton /></> : <Link className="button button-primary mt-2" href="/connexion" onClick={closeMenu}>{t("navigation", "login")}</Link>}<LanguageSelector /></div>
      </aside>
    </div> : null}
  </div>;
}
