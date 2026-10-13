import { NextResponse } from "next/server";

import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

const validIdentifier = (value: string) => /^[A-Za-z0-9_-]{1,64}$/.test(value);

function failure(error: unknown) {
  const known = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
  const response = NextResponse.json({ code: known.code, detail: known.message }, { status: known.status });
  return known.status === 401 ? clearPrivateSession(response) : response;
}

export async function POST(request: Request, { params }: { params: Promise<{ invitationId: string; action: string }> }) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const route = await params;
    if (!validIdentifier(route.invitationId)) return NextResponse.json({ code: "invalid_invitation_id", detail: "Identifiant d’invitation invalide." }, { status: 400 });
    if (!(route.action === "accept" || route.action === "decline")) return NextResponse.json({ code: "invalid_action", detail: "Action invalide." }, { status: 400 });
    const result = await authenticatedBackendRequest<unknown>(
      `/api/v1/me/business-invitations/${route.invitationId}/${route.action}-authenticated/`,
      readPrivateSession(request),
      { method: "POST", json: {} },
    );
    const response = NextResponse.json({ invitation: result.data });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) { return failure(error); }
}
