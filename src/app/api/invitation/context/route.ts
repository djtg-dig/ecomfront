import { NextResponse } from "next/server";
import { PrivateSessionError, authenticatedBackendRequest, clearPrivateSession, persistPrivateSession, readPrivateSession } from "@/lib/auth/private-session";
import { invitationContextCookieName, readInvitationContext } from "@/lib/auth/invitation-context";
import { requestCookie } from "@/lib/auth/security";

type Invitation = { public_id: string; business_name: string; title: string; permissions: string[]; status: string; expires_at: string };
type InvitationPageState = "authentication_required" | "reauthentication_required" | "email_verification_required" | "recipient_mismatch" | "invalid" | "error";

function pageState(state: InvitationPageState, detail: string, status = 200) {
  return NextResponse.json({ state, detail }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const context = readInvitationContext(requestCookie(request, invitationContextCookieName));
  if (!context) return pageState("invalid", "Le lien d’invitation est invalide ou expiré.");
  try {
    const result = await authenticatedBackendRequest<Invitation[]>("/api/v1/me/business-invitations/", readPrivateSession(request));
    const invitation = result.data.find((item) => item.public_id === context.invitationId);
    if (!invitation) return pageState("recipient_mismatch", "Cette invitation est destinée à une autre adresse e-mail.");
    const response = NextResponse.json({ state: "ready", invitation }, { headers: { "Cache-Control": "no-store" } });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) {
    const known = error instanceof PrivateSessionError ? error : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
    if (known.code === "session_expired") return clearPrivateSession(pageState("authentication_required", "Veuillez vous connecter avec votre compte Carri Account pour consulter cette invitation et y répondre."));
    if (known.code === "carri_reauthentication_required") return pageState("reauthentication_required", "Une nouvelle connexion Carri Account est nécessaire pour traiter cette invitation.");
    if (known.code === "verified_email_required") return pageState("email_verification_required", known.message);
    if (known.code === "invitation_recipient_mismatch") return pageState("recipient_mismatch", "Cette invitation est destinée à une autre adresse e-mail.");
    return pageState("error", known.message, known.status === 503 ? 503 : 200);
  }
}
