import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const query = new URL(request.url).searchParams;
    const product = query.get("product") ?? undefined;
    const variant = query.get("variant") ?? undefined;
    const lowStock = query.get("low_stock") ?? undefined;
    if ((product && !validPrivateIdentifier(product)) || (variant && !validPrivateIdentifier(variant)) || (lowStock && lowStock !== "true")) return invalidIdentifier("Filtre d’inventaire invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/inventory/`, readPrivateSession(request), { query: { product, variant, low_stock: lowStock } });
    return privateJson(result, { inventory: result.data });
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
