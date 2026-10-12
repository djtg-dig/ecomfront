import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; inventoryId: string }> };
async function ids(context: Context) {
  const values = await context.params;
  return validPrivateIdentifier(values.businessId) && validPrivateIdentifier(values.inventoryId) ? values : null;
}

export async function GET(request: Request, context: Context) {
  try {
    const route = await ids(context);
    if (!route) return invalidIdentifier("Identifiant d’entreprise ou inventaire invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/inventory/${route.inventoryId}/movements/`, readPrivateSession(request));
    return privateJson(result, { movements: result.data });
  } catch (error) { return privateFailure(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const route = await ids(context);
    if (!route) return invalidIdentifier("Identifiant d’entreprise ou inventaire invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/inventory/${route.inventoryId}/movements/`, readPrivateSession(request), { method: "POST", json: await request.json() });
    return privateJson(result, { movement: result.data }, 201);
  } catch (error) { return privateFailure(error); }
}
