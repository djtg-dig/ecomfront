import { SaleManager } from "@/components/sales/sale-manager";
export default async function SalesPage({ params }: { params: Promise<{ businessId: string }> }) { return <SaleManager businessId={(await params).businessId} />; }
