import { ProductWorkspace } from "@/components/catalog/product-catalog";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string; productId: string }> };
export default function ProductPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><ProductContent params={params} /></Suspense>; }
async function ProductContent({ params }: Props) { const { businessId, productId } = await params; return <ProductWorkspace businessId={businessId} productId={productId} />; }
