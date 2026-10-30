"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { PublicCatalogPage, PublicProduct } from "@/lib/api/public-catalog";

type Product = PublicProduct;
type Listing = PublicCatalogPage;
type Suggestion = { type: "PRODUCT" | "CATEGORY" | "BUSINESS"; label: string; href: string };

function money(product: Product) { return new Intl.NumberFormat("fr-CD", { style: "currency", currency: product.currency, maximumFractionDigits: 2 }).format(Number(product.max_price)); }

export function ProductCard({ product }: { product: Product }) {
  return <Link href={`/produits/${product.public_id}`} className="content-panel group overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-md"><div className="aspect-[4/3] bg-[var(--surface-raised)]">{product.image ? <img src={product.image} alt={product.name} className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center text-sm text-[var(--muted)]">Image indisponible</div>}</div><div className="p-4"><p className="text-xs text-[var(--muted)]">{product.category_name ?? "Produit"}</p><h2 className="mt-1 font-semibold text-[var(--brand-secondary)]">{product.name}</h2><p className="mt-1 text-xs">{product.is_online_purchasable ? "Achat en ligne disponible" : "Achat en ligne indisponible"}{product.is_home_deliverable ? " · Livraison à domicile disponible" : ""}</p><p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{product.description || "Découvrez ce produit."}</p><div className="mt-4 flex items-end justify-between gap-3"><strong>{money(product)}</strong><span className="text-xs text-[var(--muted)]">{product.business_name}</span></div></div></Link>;
}

export function MarketplaceSearch() {
  const [query, setQuery] = useState(""); const [suggestions, setSuggestions] = useState<Suggestion[]>([]); const [open, setOpen] = useState(false); const request = useRef(0);
  useEffect(() => { const trimmed = query.trim(); if (!trimmed) return; const id = ++request.current; const timer = window.setTimeout(async () => { try { const response = await fetch(`/api/public/catalog/products/suggestions/?q=${encodeURIComponent(trimmed)}`); const data = await response.json() as Suggestion[]; if (id === request.current) setSuggestions(data); } catch { if (id === request.current) setSuggestions([]); } }, 220); return () => window.clearTimeout(timer); }, [query]);
  function submit(event: FormEvent) { event.preventDefault(); const value = query.trim(); if (value) window.location.assign(`/recherche?q=${encodeURIComponent(value)}`); }
  return <form onSubmit={submit} className="relative w-full max-w-2xl"><label className="sr-only" htmlFor="marketplace-search">Rechercher un produit, une catégorie ou une boutique</label><input id="marketplace-search" value={query} onChange={(event) => { setQuery(event.target.value); if (!event.target.value.trim()) setSuggestions([]); setOpen(true); }} onFocus={() => setOpen(true)} className="w-full rounded-full border border-[var(--line)] bg-white px-5 py-3 pr-24 shadow-sm" placeholder="Que recherchez-vous ?" autoComplete="off"/><button className="button button-primary absolute right-1 top-1" type="submit">Rechercher</button>{open && suggestions.length ? <ul role="listbox" className="content-panel absolute z-20 mt-2 w-full overflow-hidden p-1">{suggestions.map((item) => <li key={`${item.type}-${item.href}`}><Link role="option" onClick={() => setOpen(false)} className="block rounded px-4 py-3 hover:bg-[var(--surface-raised)]" href={item.href}><span className="mr-2 text-xs font-semibold text-[muted)]">{item.type}</span>{item.label}</Link></li>)}</ul> : null}</form>;
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
  return <><section className="border-b border-[var(--line)] bg-[var(--surface-raised)]"><div className="site-container py-14"><p className="eyebrow">Marketplace</p><h1 className="mt-3 max-w-3xl text-4xl font-semibold text-[var(--brand-secondary)] sm:text-5xl">Découvrez les produits de plusieurs boutiques.</h1><div className="mt-7"><MarketplaceSearch /></div></div></section><section className="site-container py-10"><h2 className="text-2xl font-semibold">À découvrir</h2>{initialError ? <p role="alert" className="mt-5 text-[var(--muted)]">Le catalogue est temporairement indisponible. Réessayez dans un instant.</p> : !initialListing ? <p className="mt-5 text-[var(--muted)]">Aucun produit public pour le moment.</p> : initialListing.results.length === 0 ? <p className="mt-5 text-[var(--muted)]">Aucun produit public pour le moment.</p> : <><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{initialListing.results.map((product) => <ProductCard key={product.public_id} product={product} />)}</div><PublicPagination listing={initialListing} /></>}</section></>;
}

export function MarketplaceResults({ initialListing, title, initialError }: { initialListing: Listing | null; title: string; initialError: boolean }) {
  return <section className="site-container py-12"><MarketplaceSearch /><h1 className="mt-10 text-3xl font-semibold text-[var(--brand-secondary)]">{title}</h1>{initialError ? <p role="alert" className="mt-5">Impossible de charger ces produits.</p> : !initialListing || initialListing.results.length === 0 ? <p className="mt-5 text-[var(--muted)]">Aucun résultat.</p> : <><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{initialListing.results.map((product) => <ProductCard key={product.public_id} product={product} />)}</div><PublicPagination listing={initialListing} /></>}</section>;
}
