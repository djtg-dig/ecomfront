import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

const statuses = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const search = new URL(request.url).searchParams;
    const status = search.get("status") ?? undefined;
    const category = search.get("category") ?? undefined;
    const term = search.get("search") ?? undefined;
    if ((status && !statuses.has(status)) || (category && !validPrivateIdentifier(category)) || (term && term.length > 240)) return invalidIdentifier("Filtre de catalogue invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/products/`, readPrivateSession(request), { query: { status, category, search: term } });
    return privateJson(result, { products: result.data });
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
