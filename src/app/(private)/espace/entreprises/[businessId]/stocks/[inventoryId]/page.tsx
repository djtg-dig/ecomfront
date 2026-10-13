import { InventoryManager } from "@/components/inventory/inventory-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string; inventoryId: string }> };
export default function InventoryDetailPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><InventoryDetailContent params={params} /></Suspense>; }
async function InventoryDetailContent({ params }: Props) {
  const { businessId, inventoryId } = await params;
  return <InventoryManager businessId={businessId} inventoryId={inventoryId} />;
}
