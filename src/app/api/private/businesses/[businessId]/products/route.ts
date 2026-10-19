import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

const statuses = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);
type ProductPage = { count: number; next: string | null; previous: string | null; results: unknown[] };

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const search = new URL(request.url).searchParams;
    const status = search.get("status") ?? undefined;
    const category = search.get("category") ?? undefined;
    const term = search.get("search") ?? undefined;
    const page = search.get("page") ?? "1";
    if ((status && !statuses.has(status)) || (category && !validPrivateIdentifier(category)) || (term && term.length > 240) || !/^[1-9]\d*$/.test(page)) return invalidIdentifier("Filtre de catalogue invalide.");
    const result = await authenticatedBackendRequest<ProductPage>(`/api/v1/businesses/${businessId}/products/`, readPrivateSession(request), { query: { status, category, search: term, page } });
    return privateJson(result, { products: result.data.results, pagination: { count: result.data.count, next: result.data.next, previous: result.data.previous } });
  } catch (error) { return privateFailure(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/products/`, readPrivateSession(request), { method: "POST", json: await request.json() });
    return privateJson(result, { product: result.data }, 201);
  } catch (error) { return privateFailure(error); }
}
