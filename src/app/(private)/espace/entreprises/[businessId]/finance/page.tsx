import { FinanceManager } from "@/components/finance/finance-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };
export default function FinancePage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><FinanceContent params={params} /></Suspense>; }
async function FinanceContent({ params }: Props) { return <FinanceManager businessId={(await params).businessId} />; }
