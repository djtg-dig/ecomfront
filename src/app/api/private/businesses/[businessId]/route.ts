import { NextResponse } from "next/server";
import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

const valid = (value: string) => /^[A-Za-z0-9_-]{1,64}$/.test(value);
function failure(error: unknown) {
  const known = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
  const response = NextResponse.json({ code: known.code, detail: known.message }, { status: known.status });
  return known.status === 401 ? clearPrivateSession(response) : response;
}
export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try { const { businessId } = await params; if (!valid(businessId)) return NextResponse.json({ code: "invalid_business", detail: "Entreprise invalide." }, { status: 400 }); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/`, readPrivateSession(request)); const response = NextResponse.json({ business: result.data }); return result.refreshed ? persistPrivateSession(response, result.session) : response; } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try { if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "La modification n’est pas autorisée." }, { status: 403 }); const { businessId } = await params; if (!valid(businessId)) return NextResponse.json({ code: "invalid_business", detail: "Entreprise invalide." }, { status: 400 }); const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/`, readPrivateSession(request), { method: "PATCH", json: await request.json() }); const response = NextResponse.json({ business: result.data }); return result.refreshed ? persistPrivateSession(response, result.session) : response; } catch (error) { return failure(error); }
}
