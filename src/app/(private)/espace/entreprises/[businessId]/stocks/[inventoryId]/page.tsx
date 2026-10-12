import { InventoryManager } from "@/components/inventory/inventory-manager";

export default async function InventoryDetailPage({ params }: { params: Promise<{ businessId: string; inventoryId: string }> }) {
  const { businessId, inventoryId } = await params;
  return <InventoryManager businessId={businessId} inventoryId={inventoryId} />;
}
