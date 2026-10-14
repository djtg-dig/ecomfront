import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateEmpty, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; productId: string }> };
async function ids(context: Context) { const ids = await context.params; return validPrivateIdentifier(ids.businessId) && validPrivateIdentifier(ids.productId) ? ids : null; }

export async function GET(request: Request, context: Context) {
  try { const route = await ids(context); if (!route) return invalidIdentifier("Identifiant d’entreprise ou produit invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/products/${route.productId}/`, readPrivateSession(request)); return privateJson(result, { product: result.data }); }
  catch (error) { return privateFailure(error); }
}

export async function PATCH(request: Request, context: Context) {
  try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 }); const route = await ids(context); if (!route) return invalidIdentifier("Identifiant d’entreprise ou produit invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/products/${route.productId}/`, readPrivateSession(request), { method: "PATCH", json: await request.json() }); return privateJson(result, { product: result.data }); }
  catch (error) { return privateFailure(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const route = await ids(context);
    if (!route) return invalidIdentifier("Identifiant d’entreprise ou produit invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/products/${route.productId}/`, readPrivateSession(request), { method: "DELETE" });
    return privateEmpty(result);
  } catch (error) {
    return privateFailure(error);
  }
}
