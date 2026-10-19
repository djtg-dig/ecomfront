import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { getServerConfig } from "@/lib/config/server";
import { isSameOriginMutation } from "@/lib/auth/security";
import { invalidIdentifier, privateEmpty, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; productId: string; mediaId: string }> };
async function route(context: Context) { const value = await context.params; return validPrivateIdentifier(value.businessId) && validPrivateIdentifier(value.productId) && /^[0-9a-f-]{36}$/i.test(value.mediaId) ? value : null; }
export async function PATCH(request: Request, context: Context) { try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 }); const value = await route(context); if (!value) return invalidIdentifier("Média invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${value.businessId}/products/${value.productId}/media/${value.mediaId}/`, readPrivateSession(request), { method: "PATCH", json: await request.json() }); return privateJson(result, { media: result.data }); } catch (error) { return privateFailure(error); } }
export async function DELETE(request: Request, context: Context) { try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 }); const value = await route(context); if (!value) return invalidIdentifier("Média invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${value.businessId}/products/${value.productId}/media/${value.mediaId}/`, readPrivateSession(request), { method: "DELETE" }); return privateEmpty(result); } catch (error) { return privateFailure(error); } }
