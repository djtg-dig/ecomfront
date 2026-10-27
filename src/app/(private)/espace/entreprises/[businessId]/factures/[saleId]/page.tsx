import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";
import { SaleManager } from "@/components/sales/sale-manager";

type Props = { params: Promise<{ businessId: string; saleId: string }> };

export default function InvoicePage({ params }: Props) {
  return <Suspense fallback={<PrivatePageFallback />}><InvoiceContent params={params} /></Suspense>;
}

async function InvoiceContent({ params }: Props) {
  const { businessId, saleId } = await params;
  return <SaleManager businessId={businessId} saleId={saleId} scope="invoices" />;
}
