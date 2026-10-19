import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try { const { businessId } = await params; if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/currencies/`, readPrivateSession(request)); return privateJson(result, { currencies: result.data }); } catch (error) { return privateFailure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 }); const { businessId } = await params; if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/currencies/`, readPrivateSession(request), { method: "POST", json: await request.json() }); return privateJson(result, { currency: result.data }, 201); } catch (error) { return privateFailure(error); }
}
