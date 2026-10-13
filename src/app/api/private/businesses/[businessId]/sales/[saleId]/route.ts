import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";
type Context = { params: Promise<{ businessId: string; saleId: string }> };
export async function GET(request: Request, context: Context) { try { const { businessId, saleId } = await context.params; if (!validPrivateIdentifier(businessId) || !validPrivateIdentifier(saleId)) return invalidIdentifier("Identifiant d’entreprise ou vente invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/sales/${saleId}/`, readPrivateSession(request)); return privateJson(result, { sale: result.data }); } catch (error) { return privateFailure(error); } }
