"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { MarketplaceSearch } from "@/components/public/marketplace";

type Product = { public_id: string; name: string; description: string; business: string; business_name: string; category: string | null; category_name: string | null; selling_price: string; min_price: string; max_price: string; currency: string; is_negotiable: boolean; unit: string; image: string | null };

export default function ProductPage({ params }: PageProps<"/produits/[productId]">) {
  const { productId } = use(params); const [product, setProduct] = useState<Product | null>(null); const [error, setError] = useState(false);
  useEffect(() => { fetch(`/api/public/catalog/products/${encodeURIComponent(productId)}/`).then((response) => response.ok ? response.json() : Promise.reject()).then(setProduct).catch(() => setError(true)); }, [productId]);
  if (error) return <section className="site-container py-12"><p role="alert">Produit introuvable ou indisponible.</p></section>;
  if (!product) return <section className="site-container py-12" aria-busy="true">Chargement…</section>;
  const price = new Intl.NumberFormat("fr-CD", { style: "currency", currency: product.currency }).format(Number(product.max_price));
  return <section className="site-container py-10"><MarketplaceSearch /><article className="mt-10 grid gap-8 md:grid-cols-2"><div className="aspect-square overflow-hidden rounded-xl bg-[var(--surface-raised)]">{product.image ? <img src={product.image} alt={product.name} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[var(--muted)]">Image indisponible</div>}</div><div><p className="eyebrow">{product.category_name ?? "Produit"}</p><h1 className="mt-3 text-4xl font-semibold text-[var(--brand-secondary)]">{product.name}</h1><p className="mt-5 whitespace-pre-wrap leading-7 text-[var(--muted)]">{product.description || "Aucune description disponible."}</p><p className="mt-7 text-2xl font-semibold">{price}</p><p className="mt-2 text-sm text-[var(--muted)]">Vendu par <Link className="underline" href={`/boutiques/${product.business}`}>{product.business_name}</Link></p><Link className="button button-primary mt-7" href={`/connexion?returnTo=${encodeURIComponent(`/produits/${product.public_id}`)}`}>Ajouter au panier</Link></div></article></section>;
}
