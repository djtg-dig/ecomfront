"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, X, type LucideIcon } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";

export type PrivateNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  secondary?: boolean;
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/espace" && pathname.startsWith(`${href}/`));
}

function navigationClassName(active: boolean, secondary = false) {
  return `private-navigation-link${active ? " private-navigation-link--active" : ""}${secondary ? " private-navigation-link--secondary" : ""}`;
}

export function PrivateSidebarNavigation({ navigation, pathname }: Readonly<{ navigation: PrivateNavigationItem[]; pathname: string }>) {
  return (
    <nav aria-label="Navigation privée" className="private-sidebar order-3 hidden w-full shrink-0 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] md:order-none md:flex md:self-start md:sticky md:top-20 md:flex-col">
      {navigation.map((item, index) => {
        const Icon = item.icon;
        const isNewSection = !item.secondary && item.section && item.section !== navigation[index - 1]?.section;
        const active = isActive(pathname, item.href);
        const link = <Link aria-current={active ? "page" : undefined} className={navigationClassName(active, item.secondary)} href={item.href}>
          <Icon aria-hidden="true" size={18} strokeWidth={2} />
          <span>{item.label}</span>
        </Link>;
        return <Fragment key={item.href}>
          {isNewSection ? <p className="px-3 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{item.section}</p> : null}
          {item.secondary ? <div className="mt-auto border-t border-[var(--line)] pt-3">{link}</div> : link}
        </Fragment>;
      })}
    </nav>
  );
}

export function PrivateMobileNavigation({ mobileSection, navigation, pathname, title }: Readonly<{ mobileSection: string; navigation: PrivateNavigationItem[]; pathname: string; title: string }>) {
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
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (button?.isConnected) button.focus({ preventScroll: true });
    };
  }, [open]);

  const primaryNavigation = navigation.filter((item) => !item.secondary);
  const secondaryNavigation = navigation.filter((item) => item.secondary);
  return <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
    <Link aria-label="Retour à l’accueil" className="brand-mark grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold" href="/" onClick={close}>E</Link>
    <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>{title}</p>
    <button aria-controls="private-mobile-navigation" aria-expanded={open} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} className="button button-outline grid min-h-11 min-w-11 shrink-0 place-items-center px-3" onClick={() => setOpen((current) => !current)} ref={buttonRef} type="button">
      {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
    </button>
    {open ? <div className="fixed inset-0 z-50" role="presentation">
      <button aria-label="Fermer le menu" className="absolute inset-0 bg-black/30" onClick={close} type="button" />
      <aside aria-label="Navigation privée mobile" aria-modal="true" className="absolute right-0 top-0 flex h-full w-[min(20rem,calc(100vw-1rem))] flex-col overflow-y-auto bg-[var(--surface-raised)] p-5 shadow-2xl" id="private-mobile-navigation" ref={panelRef} role="dialog">
        <div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate text-sm font-semibold">{title}</p><button aria-label="Fermer le menu" className="button button-outline min-h-11 min-w-11 shrink-0 px-3" onClick={close} ref={closeButtonRef} type="button"><X aria-hidden="true" size={20} /></button></div>
        <p className="mt-5 text-xs font-medium text-[var(--muted)]">{mobileSection}</p>
        <nav className="mt-2 grid gap-1" aria-label="Navigation mobile">{primaryNavigation.map((item) => { const Icon = item.icon; const active = isActive(pathname, item.href); return <Link aria-current={active ? "page" : undefined} className={navigationClassName(active)} href={item.href} key={item.href} onClick={close}><Icon aria-hidden="true" size={18} /><span>{item.label}</span></Link>; })}</nav>
        {secondaryNavigation.length ? <div className="mt-5 border-t border-[var(--line)] pt-4">{secondaryNavigation.map((item) => <Link aria-current={isActive(pathname, item.href) ? "page" : undefined} className={navigationClassName(isActive(pathname, item.href), true)} href={item.href} key={item.href} onClick={close}><ArrowLeft aria-hidden="true" size={18} /><span>{item.label}</span></Link>)}</div> : null}
        <div className="mt-4 border-t border-[var(--line)] pt-4"><LogoutButton /></div>
      </aside>
    </div> : null}
  </div>;
}
