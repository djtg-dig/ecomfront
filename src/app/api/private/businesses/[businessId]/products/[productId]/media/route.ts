import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { getServerConfig } from "@/lib/config/server";
import { isSameOriginMutation } from "@/lib/auth/security";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Context = { params: Promise<{ businessId: string; productId: string }> };
async function route(context: Context) { const value = await context.params; return validPrivateIdentifier(value.businessId) && validPrivateIdentifier(value.productId) ? value : null; }

export async function GET(request: Request, context: Context) { try { const value = await route(context); if (!value) return invalidIdentifier("Produit invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${value.businessId}/products/${value.productId}/media/`, readPrivateSession(request)); return privateJson(result, { media: result.data }); } catch (error) { return privateFailure(error); } }
export async function POST(request: Request, context: Context) { try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 }); const value = await route(context); const contentType = request.headers.get("content-type"); if (!value || !contentType?.startsWith("multipart/form-data")) return invalidIdentifier("Téléversement invalide."); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${value.businessId}/products/${value.productId}/media/`, readPrivateSession(request), { method: "POST", rawBody: await request.arrayBuffer(), contentType }); return privateJson(result, { media: result.data }, 201); } catch (error) { return privateFailure(error); } }
