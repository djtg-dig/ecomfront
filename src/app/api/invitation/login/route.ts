import { NextResponse } from "next/server";
import { invitationContextCookieName, invitationReturnCookieName, readInvitationContext } from "@/lib/auth/invitation-context";
import { sessionCookieOptions } from "@/lib/auth/session";
import { getServerConfig } from "@/lib/config/server";
import { requestCookie } from "@/lib/auth/security";

export async function GET(request: Request) {
  let config;
  try { config = getServerConfig(); } catch { return new Response("Service indisponible.", { status: 503 }); }
  if (!readInvitationContext(requestCookie(request, invitationContextCookieName))) {
    return NextResponse.redirect(new URL("/invitation?erreur=lien_invalide", config.frontendUrl), 303);
  }
  const response = NextResponse.redirect(new URL("/api/auth/carri/login", config.frontendUrl), 303);
  response.cookies.set(invitationReturnCookieName, "1", sessionCookieOptions(600));
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
