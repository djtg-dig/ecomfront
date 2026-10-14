import { Suspense } from "react";

import { PartnerDirectory } from "@/components/partners/partner-directory";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string; partnerId: string }> };
export default function CustomerPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><Content params={params} /></Suspense>; }
async function Content({ params }: Props) { const values = await params; return <PartnerDirectory businessId={values.businessId} kind="customer" partnerId={values.partnerId} />; }
