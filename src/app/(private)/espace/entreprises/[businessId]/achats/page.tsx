import { PurchaseManager } from "@/components/purchases/purchase-manager";
export default async function PurchasesPage({ params }: { params: Promise<{ businessId: string }> }) { return <PurchaseManager businessId={(await params).businessId} />; }
