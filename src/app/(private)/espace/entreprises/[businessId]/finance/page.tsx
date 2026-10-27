import { FinanceManager } from "@/components/finance/finance-manager";
import { Suspense } from "react";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }>; searchParams: Promise<{ receivable?: string }> };
export default function FinancePage({ params, searchParams }: Props) { return <Suspense fallback={<PrivatePageFallback />}><FinanceContent params={params} searchParams={searchParams} /></Suspense>; }
async function FinanceContent({ params, searchParams }: Props) { const { businessId } = await params; const { receivable } = await searchParams; return <FinanceManager businessId={businessId} receivableId={receivable} />; }
