import { CommercialSettings } from "@/components/businesses/commercial-settings";

export default async function CommercialSettingsPage({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercialSettings businessId={(await params).businessId} />;
}
