import { BusinessSettingsHub } from "@/components/businesses/business-settings-hub";

export default async function BusinessSettingsPage({ params }: { params: Promise<{ businessId: string }> }) { return <BusinessSettingsHub businessId={(await params).businessId} />; }
