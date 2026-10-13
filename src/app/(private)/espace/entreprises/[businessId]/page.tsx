import { Suspense } from "react";

import { BusinessEditor } from "@/components/businesses/business-manager";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };

export default function BusinessPage({ params }: Props) {
  return <Suspense fallback={<PrivatePageFallback />}><BusinessContent params={params} /></Suspense>;
}

async function BusinessContent({ params }: Props) {
  const { businessId } = await params;
  return <BusinessEditor businessId={businessId} />;
}
