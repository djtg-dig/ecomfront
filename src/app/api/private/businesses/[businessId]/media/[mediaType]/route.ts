import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { getServerConfig } from "@/lib/config/server";
import { isSameOriginMutation } from "@/lib/auth/security";
import { invalidIdentifier, privateEmpty, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; mediaType: string }> };
async function route(context: Context) { const value = await context.params; return validPrivateIdentifier(value.businessId) && ["logo", "banner"].includes(value.mediaType) ? value : null; }

export async function GET(request: Request, context: Context) { try { const value = await route(context); if (!value) return invalidIdentifier("Média entreprise invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${value.businessId}/media/${value.mediaType}/`, readPrivateSession(request)); return privateJson(result, { media: result.data }); } catch (error) { return privateFailure(error); } }
export async function PATCH(request: Request, context: Context) { try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 }); const value = await route(context); const contentType = request.headers.get("content-type"); if (!value || !contentType?.startsWith("multipart/form-data")) return invalidIdentifier("Téléversement invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${value.businessId}/media/${value.mediaType}/`, readPrivateSession(request), { method: "PATCH", rawBody: await request.arrayBuffer(), contentType }); return privateJson(result, { media: result.data }); } catch (error) { return privateFailure(error); } }
export async function DELETE(request: Request, context: Context) { try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 }); const value = await route(context); if (!value) return invalidIdentifier("Média entreprise invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${value.businessId}/media/${value.mediaType}/`, readPrivateSession(request), { method: "DELETE" }); return privateEmpty(result); } catch (error) { return privateFailure(error); } }
