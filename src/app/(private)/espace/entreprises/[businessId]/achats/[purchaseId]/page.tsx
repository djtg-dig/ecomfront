import { PurchaseManager } from "@/components/purchases/purchase-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string; purchaseId: string }> };
export default function PurchasePage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><PurchaseContent params={params} /></Suspense>; }
async function PurchaseContent({ params }: Props) { const { businessId, purchaseId } = await params; return <PurchaseManager businessId={businessId} purchaseId={purchaseId} />; }
