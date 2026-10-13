import { FinanceManager } from "@/components/finance/finance-manager";
export default async function FinancePage({ params }: { params: Promise<{ businessId: string }> }) { return <FinanceManager businessId={(await params).businessId} />; }
