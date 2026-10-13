import { InventoryManager } from "@/components/inventory/inventory-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };
export default function InventoryPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><InventoryContent params={params} /></Suspense>; }
async function InventoryContent({ params }: Props) {
  return <InventoryManager businessId={(await params).businessId} />;
}
