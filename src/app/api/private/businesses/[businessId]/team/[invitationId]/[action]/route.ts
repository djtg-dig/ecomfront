import { NextResponse } from "next/server";

import {
  PrivateSessionError,
  authenticatedBackendRequest,
  clearPrivateSession,
  persistPrivateSession,
  readPrivateSession,
} from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

const validIdentifier = (value: string) => /^[A-Za-z0-9_-]{1,64}$/.test(value);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string; invitationId: string; action: string }> },
) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) {
      return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    }

    const route = await params;
    if (!validIdentifier(route.businessId) || !validIdentifier(route.invitationId)) {
      return NextResponse.json({ code: "invalid_identifier", detail: "Identifiant invalide." }, { status: 400 });
    }
    if (!(["resend", "revoke"] as const).includes(route.action as "resend" | "revoke")) {
      return NextResponse.json({ code: "invalid_action", detail: "Action invalide." }, { status: 400 });
    }

    const result = await authenticatedBackendRequest<unknown>(
      `/api/v1/businesses/${route.businessId}/invitations/${route.invitationId}/${route.action}/`,
      readPrivateSession(request),
      { method: "POST", json: {} },
    );
    const response = NextResponse.json({ invitation: result.data });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) {
    const safeError = error instanceof PrivateSessionError
      ? error
      : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
    const response = NextResponse.json({ code: safeError.code, detail: safeError.message }, { status: safeError.status });
    return safeError.status === 401 ? clearPrivateSession(response) : response;
  }
}
