import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string; customerId: string }> }) {
  try {
    const { businessId, customerId } = await params;
    if (!validPrivateIdentifier(businessId) || !validPrivateIdentifier(customerId)) return invalidIdentifier("Identifiant d’entreprise ou client invalide.");
    const page = new URL(request.url).searchParams.get("page");
    if (page && !/^\d+$/.test(page)) return invalidIdentifier("Page invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/customers/${customerId}/profile/`, readPrivateSession(request), { query: { page: page || undefined } });
    return privateJson(result, { profile: result.data });
  } catch (error) { return privateFailure(error); }
}
