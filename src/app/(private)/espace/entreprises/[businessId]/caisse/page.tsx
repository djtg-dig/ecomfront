import { Suspense } from "react";

import { PosCheckout } from "@/components/sales/pos-checkout";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };

export default function PosPage({ params }: Props) {
  return <Suspense fallback={<PrivatePageFallback />}><PosContent params={params} /></Suspense>;
}

async function PosContent({ params }: Props) {
  return <PosCheckout businessId={(await params).businessId} />;
}
