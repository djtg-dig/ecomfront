import { ProductCatalog } from "@/components/catalog/product-catalog";
export default async function ProductPage({ params }: { params: Promise<{ businessId: string; productId: string }> }) { const { businessId, productId } = await params; return <ProductCatalog businessId={businessId} productId={productId} />; }
