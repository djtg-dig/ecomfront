import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string; supplierId: string }> }) {
  try {
    const { businessId, supplierId } = await params;
    if (!validPrivateIdentifier(businessId) || !validPrivateIdentifier(supplierId)) return invalidIdentifier("Identifiant d’entreprise ou fournisseur invalide.");
    const page = new URL(request.url).searchParams.get("page");
    if (page && !/^\d+$/.test(page)) return invalidIdentifier("Page invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/suppliers/${supplierId}/profile/`, readPrivateSession(request), { query: { page: page || undefined } });
    return privateJson(result, { profile: result.data });
  } catch (error) { return privateFailure(error); }
}
