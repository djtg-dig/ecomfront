import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; memberId: string }> };

async function identifiers(context: Context) {
  const { businessId, memberId } = await context.params;
  return validPrivateIdentifier(businessId) && validPrivateIdentifier(memberId) ? { businessId, memberId } : null;
}

export async function GET(request: Request, context: Context) {
  try {
    const route = await identifiers(context);
    if (!route) return invalidIdentifier("Identifiant d’entreprise ou de membre invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/members/${route.memberId}/permissions/`, readPrivateSession(request));
    return privateJson(result, { permissions: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const route = await identifiers(context);
    if (!route) return invalidIdentifier("Identifiant d’entreprise ou de membre invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/members/${route.memberId}/permissions/`, readPrivateSession(request), { method: "POST", json: await request.json() });
    return privateJson(result, { permission: result.data }, 201);
  } catch (error) {
    return privateFailure(error);
  }
}
