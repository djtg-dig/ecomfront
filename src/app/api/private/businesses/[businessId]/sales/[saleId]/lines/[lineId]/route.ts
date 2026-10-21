import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; saleId: string; lineId: string }> };

async function routeIds(context: Context) {
  const values = await context.params;
  return validPrivateIdentifier(values.businessId) && validPrivateIdentifier(values.saleId) && validPrivateIdentifier(values.lineId) ? values : null;
}

async function mutation(request: Request, context: Context, method: "PATCH" | "DELETE") {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const route = await routeIds(context);
    if (!route) return invalidIdentifier("Identifiant de ligne invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/sales/${route.saleId}/lines/${route.lineId}/`, readPrivateSession(request), method === "PATCH" ? { method, json: await request.json() } : { method });
    return method === "DELETE" ? new NextResponse(null, { status: 204 }) : privateJson(result, { line: result.data });
  } catch (error) { return privateFailure(error); }
}

export async function PATCH(request: Request, context: Context) { return mutation(request, context, "PATCH"); }
export async function DELETE(request: Request, context: Context) { return mutation(request, context, "DELETE"); }
