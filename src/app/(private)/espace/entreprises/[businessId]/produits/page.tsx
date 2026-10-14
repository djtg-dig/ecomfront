import { ProductWorkspace } from "@/components/catalog/product-catalog";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };
export default function ProductsPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><ProductsContent params={params} /></Suspense>; }
async function ProductsContent({ params }: Props) { const { businessId } = await params; return <ProductWorkspace businessId={businessId} />; }
