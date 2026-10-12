import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; inventoryId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { businessId, inventoryId } = await context.params;
    if (!validPrivateIdentifier(businessId) || !validPrivateIdentifier(inventoryId)) return invalidIdentifier("Identifiant d’entreprise ou inventaire invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/inventory/${inventoryId}/`, readPrivateSession(request));
    return privateJson(result, { inventoryItem: result.data });
  } catch (error) { return privateFailure(error); }
}
