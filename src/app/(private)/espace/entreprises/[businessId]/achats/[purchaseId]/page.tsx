import { PurchaseManager } from "@/components/purchases/purchase-manager";
export default async function PurchasePage({ params }: { params: Promise<{ businessId: string; purchaseId: string }> }) { const { businessId, purchaseId } = await params; return <PurchaseManager businessId={businessId} purchaseId={purchaseId} />; }
