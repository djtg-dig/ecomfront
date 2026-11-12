import { NextResponse } from "next/server";

import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";

type Identity = { id: string; carri_subject: string; avatar_url: string | null };

export async function GET(request: Request) {
  try {
    const result = await authenticatedBackendRequest<Identity>("/api/v1/auth/me/", readPrivateSession(request));
    const response = NextResponse.json({ profile: result.data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) {
    const failure = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le profil est temporairement indisponible.");
    const response = NextResponse.json({ code: failure.code, detail: failure.message }, { status: failure.status, headers: { "Cache-Control": "no-store, max-age=0" } });
    return failure.status === 401 ? clearPrivateSession(response) : response;
  }
}
