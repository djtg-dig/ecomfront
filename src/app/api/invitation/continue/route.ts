import { NextResponse } from "next/server";
import { invitationContextCookie, invitationContextCookieName } from "@/lib/auth/invitation-context";
import { getServerConfig } from "@/lib/config/server";

export async function GET(request: Request) {
  let config;
  try { config = getServerConfig(); } catch { return new Response("Service indisponible.", { status: 503 }); }
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitation") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(invitationId) || !/^[A-Za-z0-9_-]{20,255}$/.test(token)) {
    return NextResponse.redirect(new URL("/invitation?erreur=lien_invalide", config.frontendUrl), 303);
  }
  const response = NextResponse.redirect(new URL("/invitation", config.frontendUrl), 303);
  response.cookies.set({
    name: invitationContextCookieName,
    ...invitationContextCookie({ invitationId, token }),
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
