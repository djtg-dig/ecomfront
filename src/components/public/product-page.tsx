"use client";

import Link from "next/link";

import { MarketplaceAddToCart } from "@/components/carts/marketplace-add-to-cart";
import { ContactSeller } from "@/components/messaging/contact-seller";
import { CompanyVerificationBadge } from "@/components/public/company-verification-badge";
import { ProductGallery } from "@/components/public/product-gallery";
import { useLocale } from "@/components/i18n/locale-provider";
import type { PublicProduct } from "@/lib/api/public-catalog";

export function PublicProductPage({ product, unavailable }: { product: PublicProduct | null; unavailable: boolean }) {
  const { t } = useLocale();
  if (unavailable || !product) return <section className="site-container py-12"><p role="alert">{t("public", "imageUnavailable")}</p></section>;
  const price = new Intl.NumberFormat("fr-CD", { style: "currency", currency: product.currency }).format(Number(product.max_price));
  const images = product.images?.length ? product.images : product.image ? [{ url: product.image, is_primary: true, position: 0 }] : [];
  return <section className="site-container min-w-0 py-8 sm:py-12"><Link className="nav-link text-sm" href="/recherche">← {t("navigation", "marketplace")}</Link><article className="product-detail-layout mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-12"><ProductGallery images={images} productName={product.name} /><div className="product-detail-content flex flex-col"><p className="eyebrow">{product.category_name ?? t("navigation", "products")}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">{product.name}</h1><p className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)]"><span>{product.business_name}</span><CompanyVerificationBadge isVerified={product.business_is_verified} /></p><p className="mt-7 text-3xl font-semibold text-[var(--ink)]">{price}</p><div className="mt-5 flex flex-wrap gap-2"><span className={product.is_online_purchasable ? "product-status product-status-positive" : "product-status"}>{product.is_online_purchasable ? t("public", "availabilityOnline") : t("public", "availabilityUnavailable")}</span>{product.is_home_deliverable ? <span className="product-status">{t("public", "homeDelivery")}</span> : null}</div><div className="mt-7 border-t border-[var(--line)] pt-6"><h2 className="text-lg font-semibold text-[var(--ink)]">{t("navigation", "products")}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-[var(--muted)]">{product.description || t("public", "marketplaceIntro")}</p></div><MarketplaceAddToCart allowsDecimalQuantity={product.allows_decimal_quantity} business={product.business} isOnlinePurchasable={product.is_online_purchasable} product={product.public_id} unit={product.unit} /><ContactSeller business={product.business} product={product.public_id} /></div></article></section>;
}
