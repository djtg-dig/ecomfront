import { SaleManager } from "@/components/sales/sale-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string; saleId: string }> };
export default function SalePage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><SaleContent params={params} /></Suspense>; }
async function SaleContent({ params }: Props) { const { businessId, saleId } = await params; return <SaleManager businessId={businessId} saleId={saleId} scope="legacy" />; }
