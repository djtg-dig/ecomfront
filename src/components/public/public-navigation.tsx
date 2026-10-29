"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLocale } from "@/components/i18n/locale-provider";
import { LogoutButton } from "@/components/auth/logout-button";

export function PublicNavigation({ isAuthenticated }: Readonly<{ isAuthenticated: boolean }>) {
  const { t } = useLocale();
  const navigation = [
    { href: "/", label: t("navigation", "home") },
    { href: "/recherche", label: "Marketplace" },
    { href: "/fonctionnalites", label: t("navigation", "features") },
    { href: "/tarifs", label: t("navigation", "pricing") },
    { href: "/contact", label: t("navigation", "contact") },
  ];
  return <nav className="w-full sm:w-auto" aria-label="Navigation principale"><ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:justify-end">{navigation.map((item) => <li key={item.href}><Link className="nav-link" href={item.href}>{item.label}</Link></li>)}<li><LanguageSelector /></li><li>{isAuthenticated ? <><Link className="nav-link" href="/espace">{t("navigation", "workspace")}</Link><LogoutButton /></> : <Link className="button button-primary" href="/connexion">{t("navigation", "login")}</Link>}</li></ul></nav>;
}
