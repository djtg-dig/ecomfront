"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { PublicCatalogPage, PublicProduct } from "@/lib/api/public-catalog";
import { useLocale } from "@/components/i18n/locale-provider";

type Product = PublicProduct;
type Listing = PublicCatalogPage;
type Suggestion = { type: "PRODUCT" | "CATEGORY" | "BUSINESS"; label: string; href: string };

function money(product: Product) { return new Intl.NumberFormat("fr-CD", { style: "currency", currency: product.currency, maximumFractionDigits: 2 }).format(Number(product.max_price)); }

export function ProductCard({ product }: { product: Product }) {
  const { t } = useLocale();
  return <Link href={`/produits/${product.public_id}`} className="product-card group"><div className="product-card-media">{product.image ? <img src={product.image} alt={product.name} className="size-full object-contain" loading="lazy" /> : <div className="grid size-full place-items-center text-sm text-[var(--muted)]">{t("public", "imageUnavailable")}</div>}</div><div className="flex min-h-48 flex-1 flex-col p-5"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{product.category_name ?? t("navigation", "products")}</p><h2 className="mt-2 line-clamp-2 min-h-12 font-semibold text-[var(--ink)] group-hover:text-[var(--brand)]">{product.name}</h2><div className="mt-3 flex min-h-10 flex-wrap content-start gap-2 text-xs"><span className={product.is_online_purchasable ? "product-status product-status-positive" : "product-status"}>{product.is_online_purchasable ? t("public", "availabilityOnline") : t("public", "availabilityUnavailable")}</span>{product.is_home_deliverable ? <span className="product-status">{t("public", "homeDelivery")}</span> : null}</div><p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted)]">{product.description || t("public", "marketplaceIntro")}</p><div className="mt-auto flex items-end justify-between gap-3 pt-5"><strong className="text-lg text-[var(--ink)]">{money(product)}</strong><span className="line-clamp-2 text-right text-xs text-[var(--muted)]">{product.business_name}</span></div></div></Link>;
}

export function MarketplaceSearch() {
  const { t } = useLocale();
  const [query, setQuery] = useState(""); const [suggestions, setSuggestions] = useState<Suggestion[]>([]); const [open, setOpen] = useState(false); const request = useRef(0);
  useEffect(() => { const trimmed = query.trim(); if (!trimmed) return; const id = ++request.current; const timer = window.setTimeout(async () => { try { const response = await fetch(`/api/public/catalog/products/suggestions/?q=${encodeURIComponent(trimmed)}`); const data = await response.json() as Suggestion[]; if (id === request.current) setSuggestions(data); } catch { if (id === request.current) setSuggestions([]); } }, 220); return () => window.clearTimeout(timer); }, [query]);
  function submit(event: FormEvent) { event.preventDefault(); const value = query.trim(); if (value) window.location.assign(`/recherche?q=${encodeURIComponent(value)}`); }
  return <form onSubmit={submit} className="relative w-full"><label className="sr-only" htmlFor="marketplace-search">{t("public", "searchPlaceholder")}</label><input id="marketplace-search" value={query} onChange={(event) => { setQuery(event.target.value); if (!event.target.value.trim()) setSuggestions([]); setOpen(true); }} onFocus={() => setOpen(true)} className="marketplace-search-input" placeholder={t("public", "searchPlaceholder")} autoComplete="off"/><button aria-label={t("public", "searchSubmit")} className="button button-primary absolute right-1 top-1 min-h-10 px-4" type="submit">{t("public", "searchSubmit")}</button>{open && suggestions.length ? <ul role="listbox" className="content-panel absolute z-20 mt-2 w-full overflow-hidden p-1">{suggestions.map((item) => <li key={`${item.type}-${item.href}`}><Link role="option" onClick={() => setOpen(false)} className="block rounded px-4 py-3 hover:bg-[var(--surface-muted)]" href={item.href}><span className="mr-2 text-xs font-semibold text-[var(--muted)]">{item.type}</span>{item.label}</Link></li>)}</ul> : null}</form>;
}

function PublicPagination({ listing }: { listing: Listing }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const currentPage = Math.max(1, Number(search.get("page") ?? "1") || 1);
  const pageHref = (page: number) => {
    const next = new URLSearchParams(search.toString());
    if (page === 1) next.delete("page"); else next.set("page", String(page));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  if (!listing.previous && !listing.next) return null;
  return <nav aria-label="Pagination du catalogue" className="mt-8 flex items-center justify-between gap-4"><Link aria-disabled={!listing.previous} className={`button button-outline ${listing.previous ? "" : "pointer-events-none opacity-50"}`} href={pageHref(Math.max(1, currentPage - 1))}>Précédent</Link><span className="text-sm text-[var(--muted)]">Page {currentPage}</span><Link aria-disabled={!listing.next} className={`button button-outline ${listing.next ? "" : "pointer-events-none opacity-50"}`} href={pageHref(currentPage + 1)}>Suivant</Link></nav>;
}

export function MarketplaceHome({ initialListing, initialError }: { initialListing: Listing | null; initialError: boolean }) {
  const { t } = useLocale();
  return <><section className="marketplace-hero"><div className="site-container py-12 sm:py-16"><p className="eyebrow">{t("navigation", "marketplace")}</p><h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">{t("public", "marketplaceIntro")}</h1><div className="mt-8 max-w-3xl"><MarketplaceSearch /></div></div></section><section className="site-container py-10 sm:py-14"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">{t("navigation", "products")}</p><h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">{t("navigation", "marketplace")}</h2></div></div>{initialError ? <p role="alert" className="mt-6 text-[var(--muted)]">{t("public", "contactDescription")}</p> : !initialListing || initialListing.results.length === 0 ? <p className="empty-state mt-6">{t("public", "marketplaceIntro")}</p> : <><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{initialListing.results.map((product) => <ProductCard key={product.public_id} product={product} />)}</div><PublicPagination listing={initialListing} /></>}</section></>;
}

export function MarketplaceResults({ initialListing, title, initialError }: { initialListing: Listing | null; title: string; initialError: boolean }) {
  return <section className="site-container py-12"><MarketplaceSearch /><h1 className="mt-10 text-3xl font-semibold text-[var(--brand-secondary)]">{title}</h1>{initialError ? <p role="alert" className="mt-5">Impossible de charger ces produits.</p> : !initialListing || initialListing.results.length === 0 ? <p className="mt-5 text-[var(--muted)]">Aucun résultat.</p> : <><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{initialListing.results.map((product) => <ProductCard key={product.public_id} product={product} />)}</div><PublicPagination listing={initialListing} /></>}</section>;
}
