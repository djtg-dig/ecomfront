import { CurrencySettings } from "@/components/businesses/currency-settings";

export default async function SettingsCurrenciesPage({ params }: { params: Promise<{ businessId: string }> }) { return <CurrencySettings businessId={(await params).businessId} />; }
