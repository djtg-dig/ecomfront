import { InventoryManager } from "@/components/inventory/inventory-manager";

export default async function InventoryPage({ params }: { params: Promise<{ businessId: string }> }) {
  return <InventoryManager businessId={(await params).businessId} />;
}
