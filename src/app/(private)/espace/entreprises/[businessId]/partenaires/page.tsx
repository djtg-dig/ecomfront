import { Suspense } from "react";

import { PartnerDirectory } from "@/components/partners/partner-directory";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };
export default function PartnersPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><Content params={params} /></Suspense>; }
async function Content({ params }: Props) { return <PartnerDirectory businessId={(await params).businessId} />; }
