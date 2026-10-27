import { InvoiceDraftEditor } from "@/components/sales/invoice-draft-editor";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";
import { Suspense } from "react";

type Props = { params: Promise<{ businessId: string; saleId: string }> };

export default function EditInvoicePage({ params }: Props) {
  return <Suspense fallback={<PrivatePageFallback />}><EditInvoiceContent params={params} /></Suspense>;
}

async function EditInvoiceContent({ params }: Props) {
  const { businessId, saleId } = await params;
  return <InvoiceDraftEditor businessId={businessId} saleId={saleId} />;
}
