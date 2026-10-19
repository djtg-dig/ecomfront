import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

export async function PATCH(request: Request, { params }: { params: Promise<{ businessId: string; code: string }> }) {
  try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 }); const { businessId, code } = await params; if (!validPrivateIdentifier(businessId) || !/^[A-Za-z]{3}$/.test(code)) return invalidIdentifier("Identifiant invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/currencies/${code}/`, readPrivateSession(request), { method: "PATCH", json: await request.json() }); return privateJson(result, { currency: result.data }); } catch (error) { return privateFailure(error); }
}
