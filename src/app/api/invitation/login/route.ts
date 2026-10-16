import { NextResponse } from "next/server";
import {
  clearInvitationContextCookie,
  invitationContextCookieName,
} from "@/lib/auth/invitation-context";
import { getServerConfig } from "@/lib/config/server";

export async function GET() {
  let config;

  try {
    config = getServerConfig();
  } catch {
    return new Response("Service indisponible.", {
      status: 503,
    });
  }

  const response = NextResponse.redirect(
    new URL("/api/auth/carri/login", config.frontendUrl),
    303,
  );

  // Nettoyer uniquement le contexte temporaire d'invitation.
  response.cookies.set({
    name: invitationContextCookieName,
    ...clearInvitationContextCookie(),
  });

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
