import { NextResponse } from "next/server";
import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

function failure(error: unknown) {
  const known = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
  const response = NextResponse.json({ code: known.code, detail: known.message }, { status: known.status });
  response.headers.set("Cache-Control", "no-store");
  return known.status === 401 ? clearPrivateSession(response) : response;
}

export async function GET(request: Request) {
  try {
    const result = await authenticatedBackendRequest<unknown[]>("/api/v1/businesses/", readPrivateSession(request));
    const response = NextResponse.json({ businesses: result.data });
    response.headers.set("Cache-Control", "no-store");
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "La création n’est pas autorisée." }, { status: 403 });
    const payload = await request.json();
    const result = await authenticatedBackendRequest<unknown>("/api/v1/businesses/", readPrivateSession(request), { method: "POST", json: payload });
    const response = NextResponse.json({ business: result.data }, { status: 201 });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) { return failure(error); }
}
