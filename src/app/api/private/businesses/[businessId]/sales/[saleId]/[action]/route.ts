import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";
type Context = { params: Promise<{ businessId: string; saleId: string; action: string }> };
const actions = new Set(["complete", "cancel"]);
export async function POST(request: Request, context: Context) { try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 }); const route = await context.params; if (!validPrivateIdentifier(route.businessId) || !validPrivateIdentifier(route.saleId) || !actions.has(route.action)) return invalidIdentifier("Action ou identifiant de vente invalide."); const payload = route.action === "complete" ? await request.json() : {}; const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/sales/${route.saleId}/${route.action}/`, readPrivateSession(request), { method: "POST", json: payload }); return privateJson(result, { sale: result.data }); } catch (error) { return privateFailure(error); } }
