import { BusinessEditor } from "@/components/businesses/business-manager";
export default async function BusinessPage({ params }: { params: Promise<{ businessId: string }> }) { const { businessId } = await params; return <BusinessEditor businessId={businessId} />; }
