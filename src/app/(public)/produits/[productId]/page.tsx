import { PublicProductPage } from "@/components/public/product-page";
import { loadPublicCatalog, type PublicProduct } from "@/lib/api/public-catalog";

export default async function ProductPage({ params }: PageProps<"/produits/[productId]">) {
  const { productId } = await params;
  const result = await loadPublicCatalog<PublicProduct>(`products/${encodeURIComponent(productId)}`);
  return <PublicProductPage product={result.data} unavailable={result.error !== null} />;
}
