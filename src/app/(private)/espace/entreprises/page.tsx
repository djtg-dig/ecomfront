import { Suspense } from "react";

import { BusinessList } from "@/components/businesses/business-manager";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { searchParams: Promise<{ invitation?: string | string[] }> };

export default function BusinessesPage({ searchParams }: Props) {
  return <Suspense fallback={<PrivatePageFallback />}><BusinessesContent searchParams={searchParams} /></Suspense>;
}

async function BusinessesContent({ searchParams }: Props) {
  const invitation = (await searchParams).invitation;
  const outcome = typeof invitation === "string" ? invitation : undefined;
  return <BusinessList invitationOutcome={outcome} />;
}
