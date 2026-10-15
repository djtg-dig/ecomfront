import { NextResponse } from "next/server";
import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";
import { clearInvitationContextCookie, invitationContextCookieName, readInvitationContext } from "@/lib/auth/invitation-context";
import { getServerConfig } from "@/lib/config/server";
import { isSameOriginMutation, requestCookie } from "@/lib/auth/security";

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  let config; try { config = getServerConfig(); } catch { return Response.json({ code: "configuration_unavailable", detail: "Service indisponible." }, { status: 503 }); }
  if (!isSameOriginMutation(request, config)) return Response.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
  const context = readInvitationContext(requestCookie(request, invitationContextCookieName));
  const { action } = await params;
  if (!context || !["accept", "decline"].includes(action)) return Response.json({ code: "invitation_link_invalid", detail: "Le lien d’invitation est invalide ou expiré." }, { status: 400 });
  try {
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/me/business-invitations/${context.invitationId}/${action}/`, readPrivateSession(request), { method: "POST", json: { token: context.token } });
    const response = NextResponse.json({ invitation: result.data });
    response.cookies.set({ name: invitationContextCookieName, ...clearInvitationContextCookie() });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) {
    const known = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
    const response = NextResponse.json({ code: known.code, detail: known.message }, { status: known.status });
    if (known.status === 401 && known.code === "session_expired") clearPrivateSession(response);
    if (["invitation_expired", "invitation_revoked", "invitation_already_processed", "invalid_invitation_token"].includes(known.code)) {
      response.cookies.set({ name: invitationContextCookieName, ...clearInvitationContextCookie() });
    }
    return response;
  }
}
