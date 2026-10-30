"use client";

import Link from "next/link";

import { MarketplaceAddToCart } from "@/components/carts/marketplace-add-to-cart";
import type { PublicProduct } from "@/lib/api/public-catalog";

export function PublicProductPage({ product, unavailable }: { product: PublicProduct | null; unavailable: boolean }) {
  if (unavailable || !product) return <section className="site-container py-12"><p role="alert">Produit introuvable ou indisponible.</p></section>;
  const price = new Intl.NumberFormat("fr-CD", { style: "currency", currency: product.currency }).format(Number(product.max_price));
  return <section className="site-container py-10"><article className="grid gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]"><div className="grid h-[min(72vw,460px)] min-h-64 max-h-[460px] w-full place-items-center overflow-hidden rounded-xl bg-[var(--surface-raised)] p-5">{product.image ? <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" /> : <div className="grid size-full place-items-center text-[var(--muted)]">Image indisponible</div>}</div><div><p className="eyebrow">{product.category_name ?? "Produit"}</p><h1 className="mt-3 text-4xl font-semibold text-[var(--brand-secondary)]">{product.name}</h1><p className="mt-5 whitespace-pre-wrap leading-7 text-[var(--muted)]">{product.description || "Aucune description disponible."}</p><p className="mt-7 text-2xl font-semibold">{price}</p><p className="mt-2 text-sm text-[var(--muted)]">Vendu par <Link className="underline" href={`/boutiques/${product.business}`}>{product.business_name}</Link></p><MarketplaceAddToCart allowsDecimalQuantity={product.allows_decimal_quantity} business={product.business} product={product.public_id} unit={product.unit} /></div></article></section>;
}
