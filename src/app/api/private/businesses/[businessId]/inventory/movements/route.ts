import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

const movementTypes = ["IN", "OUT", "ADJUSTMENT", "TRANSFER", "SALE", "RETURN"];

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const query = new URL(request.url).searchParams;
    const product = query.get("product") || undefined;
    const type = query.get("type") || undefined;
    const origin = query.get("origin") || undefined;
    const dateFrom = query.get("date_from") || undefined;
    const dateTo = query.get("date_to") || undefined;
    const page = query.get("page") || undefined;
    if ((product && !validPrivateIdentifier(product)) || (type && !movementTypes.includes(type)) || (origin && !/^[A-Z_]{1,40}$/.test(origin)) || (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) || (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) || (page && !/^\d+$/.test(page))) return invalidIdentifier("Filtre de mouvements invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/inventory/movements/`, readPrivateSession(request), { query: { product, type, origin, date_from: dateFrom, date_to: dateTo, page } });
    return privateJson(result, { movements: result.data });
  } catch (error) { return privateFailure(error); }
}
