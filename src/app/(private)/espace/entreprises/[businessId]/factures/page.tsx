import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";
import { SaleManager } from "@/components/sales/sale-manager";

type Props = { params: Promise<{ businessId: string }> };

export default function InvoicesPage({ params }: Props) {
  return <Suspense fallback={<PrivatePageFallback />}><InvoicesContent params={params} /></Suspense>;
}

async function InvoicesContent({ params }: Props) {
  return <SaleManager businessId={(await params).businessId} scope="invoices" />;
}
