import { CommercialSettingsEditor } from "@/components/businesses/commercial-settings-editor";

// Le segment lit `params` de façon asynchrone ; Cache Components doit donc autoriser
// cette navigation bloquante plutôt que tenter de l'inclure dans son shell instantané.
export const instant = false;

export default async function CommercialSettingsEditPage({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercialSettingsEditor businessId={(await params).businessId} />;
}
