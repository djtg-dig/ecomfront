import { PurchaseManager } from "@/components/purchases/purchase-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };
export default function PurchasesPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><PurchasesContent params={params} /></Suspense>; }
async function PurchasesContent({ params }: Props) { return <PurchaseManager businessId={(await params).businessId} />; }
