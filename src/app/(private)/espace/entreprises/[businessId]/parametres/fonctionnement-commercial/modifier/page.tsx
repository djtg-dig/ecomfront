import { CommercialSettingsEditor } from "@/components/businesses/commercial-settings-editor";

export default async function CommercialSettingsEditPage({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercialSettingsEditor businessId={(await params).businessId} />;
}
