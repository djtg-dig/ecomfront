"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLocale } from "@/components/i18n/locale-provider";
import { LogoutButton } from "@/components/auth/logout-button";

export function PublicNavigation({ isAuthenticated }: Readonly<{ isAuthenticated: boolean }>) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const navigation = [
    { href: "/", label: t("navigation", "home") },
    { href: "/recherche", label: t("navigation", "marketplace") },
    { href: "/fonctionnalites", label: t("navigation", "features") },
    { href: "/tarifs", label: t("navigation", "pricing") },
    { href: "/contact", label: t("navigation", "contact") },
  ];
  return <div className="flex items-center gap-2">
    <Link aria-label={t("navigation", "cart")} className="header-icon-link" href="/compte/paniers"><ShoppingBag aria-hidden="true" size={19} /><span className="sr-only">{t("navigation", "cart")}</span></Link>
    {isAuthenticated ? <div className="relative hidden lg:block"><button aria-expanded={accountOpen} aria-haspopup="menu" className="account-trigger" onClick={() => setAccountOpen((value) => !value)} type="button"><UserRound aria-hidden="true" size={18} /><span>{t("navigation", "account")}</span></button>{accountOpen ? <div className="account-menu" role="menu"><Link href="/messages" onClick={() => setAccountOpen(false)} role="menuitem">{t("navigation", "messages")}</Link><Link href="/espace" onClick={() => setAccountOpen(false)} role="menuitem">{t("navigation", "workspace")}</Link><Link href="/espace/parametres" onClick={() => setAccountOpen(false)} role="menuitem">{t("navigation", "settings")}</Link><div className="border-t border-[var(--line)] pt-2"><LogoutButton /></div></div> : null}</div> : <Link className="button button-primary hidden min-h-10 lg:inline-flex" href="/connexion">{t("navigation", "login")}</Link>}
    <button aria-controls="public-mobile-navigation" aria-expanded={open} aria-label={open ? t("navigation", "closeMenu") : t("navigation", "openMenu")} className="button button-outline min-h-11 min-w-11 px-3 lg:hidden" onClick={() => setOpen((value) => !value)} type="button">{open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}</button>
    <nav aria-label={t("navigation", "home")} className="hidden lg:block"><ul className="flex items-center gap-5 text-sm">{navigation.map((item) => <li key={item.href}><Link className="nav-link" href={item.href}>{item.label}</Link></li>)}<li><LanguageSelector /></li></ul></nav>
    {open ? <div className="public-mobile-menu lg:hidden" id="public-mobile-navigation"><nav aria-label={t("navigation", "home")}><ul className="grid gap-1">{navigation.map((item) => <li key={item.href}><Link className="mobile-nav-link" href={item.href} onClick={() => setOpen(false)}>{item.label}</Link></li>)}</ul></nav><div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4"><Link className="mobile-nav-link" href="/compte/paniers" onClick={() => setOpen(false)}>{t("navigation", "cart")}</Link>{isAuthenticated ? <><Link className="mobile-nav-link" href="/messages" onClick={() => setOpen(false)}>{t("navigation", "messages")}</Link><Link className="mobile-nav-link" href="/espace" onClick={() => setOpen(false)}>{t("navigation", "workspace")}</Link><Link className="mobile-nav-link" href="/espace/parametres" onClick={() => setOpen(false)}>{t("navigation", "settings")}</Link><LogoutButton /></> : <Link className="button button-primary mt-2" href="/connexion" onClick={() => setOpen(false)}>{t("navigation", "login")}</Link>}<LanguageSelector /></div></div> : null}
  </div>;
}
