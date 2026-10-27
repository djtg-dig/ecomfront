import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; receivableId: string }> };
async function ids(context: Context) { const values = await context.params; return validPrivateIdentifier(values.businessId) && validPrivateIdentifier(values.receivableId) ? values : null; }
export async function GET(request: Request, context: Context) { try { const route = await ids(context); if (!route) return invalidIdentifier("Identifiant d’entreprise ou créance invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/receivables/${route.receivableId}/`, readPrivateSession(request)); return privateJson(result, { receivable: result.data }); } catch (error) { return privateFailure(error); } }
export async function PATCH(request: Request, context: Context) { try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 }); const route = await ids(context); if (!route) return invalidIdentifier("Identifiant d’entreprise ou créance invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${route.businessId}/receivables/${route.receivableId}/`, readPrivateSession(request), { method: "PATCH", json: await request.json() }); return privateJson(result, { receivable: result.data }); } catch (error) { return privateFailure(error); } }
