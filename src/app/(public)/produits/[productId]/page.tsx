import { Suspense } from "react";
import { connection } from "next/server";
import { PublicProductPage } from "@/components/public/product-page";
import { PublicCatalogFallback } from "@/components/public/public-catalog-fallback";
import { loadPublicCatalog, type PublicProduct } from "@/lib/api/public-catalog";
type ProductPageProps = Pick<PageProps<"/produits/[productId]">, "params">;

export default function ProductPage({ params }: ProductPageProps) {
  return <Suspense fallback={<PublicCatalogFallback />}><ProductCatalog params={params} /></Suspense>;
}

async function ProductCatalog({ params }: ProductPageProps) {
  await connection();
  const { productId } = await params;
  const result = await loadPublicCatalog<PublicProduct>(`products/${encodeURIComponent(productId)}`);
  return <PublicProductPage product={result.data} unavailable={result.error !== null} />;
}
