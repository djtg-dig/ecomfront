import { NextResponse } from "next/server";
import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";
import { clearInvitationContextCookie, invitationContextCookieName, readInvitationContext } from "@/lib/auth/invitation-context";
import { getServerConfig } from "@/lib/config/server";
import { isSameOriginMutation, requestCookie } from "@/lib/auth/security";

type InvitationActionResult = {
  status?: string;
  business_public_id?: string;
};

type InvitationStatus = { public_id: string; status: string };

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  let config; try { config = getServerConfig(); } catch { return Response.json({ code: "configuration_unavailable", detail: "Service indisponible." }, { status: 503 }); }
  if (!isSameOriginMutation(request, config)) return Response.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
  const context = readInvitationContext(requestCookie(request, invitationContextCookieName));
  const { action } = await params;
  if (!context || !["accept", "decline"].includes(action)) return Response.json({ code: "invitation_link_invalid", detail: "Le lien d’invitation est invalide ou expiré." }, { status: 400 });
  try {
    const result = await authenticatedBackendRequest<InvitationActionResult>(`/api/v1/me/business-invitations/${context.invitationId}/${action}/`, readPrivateSession(request), { method: "POST", json: { token: context.token } });
    const expectedStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
    if (result.data?.status !== expectedStatus) {
      return NextResponse.json(
        { code: "invitation_completion_invalid", detail: "La finalisation de l’invitation n’a pas été confirmée." },
        { status: 502 },
      );
    }
    const response = NextResponse.json({
      invitation: result.data,
      redirect_to: `/espace/entreprises?invitation=${action === "accept" ? "accepted" : "declined"}`,
    });
    response.cookies.set({ name: invitationContextCookieName, ...clearInvitationContextCookie() });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) {
    const known = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
    if (known.status === 409 && known.code === "invitation_already_processed") {
      try {
        const current = await authenticatedBackendRequest<InvitationStatus[]>(
          `/api/v1/me/business-invitations/?invitation=${encodeURIComponent(context.invitationId)}`,
          readPrivateSession(request),
        );
        const invitation = current.data.find((item) => item.public_id === context.invitationId);
        const response = NextResponse.json({ code: known.code, detail: known.message, invitation }, { status: 409 });
        return current.refreshed ? persistPrivateSession(response, current.session) : response;
      } catch {
        // Keep the original business error if the status lookup is unavailable.
      }
    }
    const response = NextResponse.json({ code: known.code, detail: known.message }, { status: known.status });
    if (known.status === 401 && known.code === "session_expired") clearPrivateSession(response);
    if (["invitation_expired", "invitation_revoked", "invalid_invitation_token"].includes(known.code)) {
      response.cookies.set({ name: invitationContextCookieName, ...clearInvitationContextCookie() });
    }
    return response;
  }
}
