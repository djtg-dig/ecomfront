import { SaleManager } from "@/components/sales/sale-manager";
export default async function SalePage({ params }: { params: Promise<{ businessId: string; saleId: string }> }) { const { businessId, saleId } = await params; return <SaleManager businessId={businessId} saleId={saleId} />; }
