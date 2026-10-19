import { BusinessBrandingSettings } from "@/components/businesses/business-branding-settings";

export default async function BusinessBrandingPage({ params }: { params: Promise<{ businessId: string }> }) { return <BusinessBrandingSettings businessId={(await params).businessId} />; }
