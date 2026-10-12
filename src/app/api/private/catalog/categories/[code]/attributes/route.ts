import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try { const { code } = await params; if (!validPrivateIdentifier(code)) return invalidIdentifier("Code de catégorie invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/product-categories/${code}/attributes/`, readPrivateSession(request)); return privateJson(result, { attributes: result.data }); }
  catch (error) { return privateFailure(error); }
}
