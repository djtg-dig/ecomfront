import { SaleManager } from "@/components/sales/sale-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };
export default function SalesPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><SalesContent params={params} /></Suspense>; }
async function SalesContent({ params }: Props) { return <SaleManager businessId={(await params).businessId} scope="sales" />; }
