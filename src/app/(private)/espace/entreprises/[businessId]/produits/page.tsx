import { ProductCatalog } from "@/components/catalog/product-catalog";
export default async function ProductsPage({ params }: { params: Promise<{ businessId: string }> }) { return <ProductCatalog businessId={(await params).businessId} />; }
