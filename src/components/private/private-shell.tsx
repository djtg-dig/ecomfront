"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";

const navigation = [
  { href: "/espace", label: "Vue d’ensemble" },
  { href: "/espace/entreprises", label: "Entreprises" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/espace" && pathname.startsWith(`${href}/`));
}

export function PrivateShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="page-shell min-h-screen">
      <header className="site-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link className="brand-lockup flex items-center gap-3 font-semibold" href="/espace">
            <span className="brand-mark grid size-8 place-items-center text-sm font-bold">E</span>
            E-commerce
          </Link>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row">
        <nav aria-label="Navigation privée" className="content-panel flex shrink-0 gap-2 p-3 lg:w-52 lg:flex-col">
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
    </div>
  );
}
