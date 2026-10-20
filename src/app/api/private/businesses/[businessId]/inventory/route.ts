import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Page = { count: number; next: string | null; previous: string | null; results: unknown[] };

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const query = new URL(request.url).searchParams;
    const product = query.get("product") ?? undefined;
    const variant = query.get("variant") ?? undefined;
    const lowStock = query.get("low_stock") ?? undefined;
    const q = query.get("q")?.trim() || undefined;
    const status = query.get("status") || undefined;
    const ordering = query.get("ordering") || undefined;
    const page = query.get("page") ?? "1";
    if ((product && !validPrivateIdentifier(product)) || (variant && !validPrivateIdentifier(variant)) || (lowStock && lowStock !== "true") || (q && q.length > 120) || (status && !["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK"].includes(status)) || (ordering && !["quantity", "-quantity"].includes(ordering)) || !/^[1-9]\d*$/.test(page)) return invalidIdentifier("Filtre d’inventaire invalide.");
    const result = await authenticatedBackendRequest<Page>(`/api/v1/businesses/${businessId}/inventory/`, readPrivateSession(request), { query: { product, variant, low_stock: lowStock, q, status, ordering, page } });
    return privateJson(result, { inventory: result.data.results, pagination: { count: result.data.count, next: result.data.next, previous: result.data.previous } });
  } catch (error) { return privateFailure(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/inventory/`, readPrivateSession(request), { method: "POST", json: await request.json() });
    return privateJson(result, { inventoryItem: result.data }, 201);
  } catch (error) { return privateFailure(error); }
}
