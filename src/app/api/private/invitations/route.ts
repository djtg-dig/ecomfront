import { NextResponse } from "next/server";

import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";

function failure(error: unknown) {
  const known = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
  const response = NextResponse.json({ code: known.code, detail: known.message }, { status: known.status });
  response.headers.set("Cache-Control", "no-store");
  return known.status === 401 ? clearPrivateSession(response) : response;
}

export async function GET(request: Request) {
  try {
    const result = await authenticatedBackendRequest<unknown[]>("/api/v1/me/business-invitations/", readPrivateSession(request));
    const response = NextResponse.json({ invitations: result.data });
    response.headers.set("Cache-Control", "no-store");
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) { return failure(error); }
}
