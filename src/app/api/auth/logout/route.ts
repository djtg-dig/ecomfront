import { NextResponse } from "next/server";

import { backendClient } from "@/lib/api/backend-client";
import { refreshEcommerceSession } from "@/lib/auth/refresh";
import { decryptSession, sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import {
  isSameOriginMutation,
  requestCookie,
  transactionCookieName,
  transactionCookieOptions,
  transactionCookiePath,
} from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

export async function POST(request: Request) {
  let config;
  try {
    config = getServerConfig();
  } catch {
    return Response.json(
      { code: "configuration_unavailable", detail: "La déconnexion est indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isSameOriginMutation(request, config)) {
    return Response.json(
      { code: "csrf_rejected", detail: "La requête de déconnexion n'est pas autorisée." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const encrypted = requestCookie(request, sessionCookieName);
  const session = encrypted ? decryptSession(encrypted) : null;
  let revoked = !session;
  if (session) {
    try {
      const sessionForRevocation = session.accessExpiresAt <= Date.now()
        ? await refreshEcommerceSession(session)
        : session;
      await backendClient.request("/api/v1/auth/logout/", {
        method: "POST",
        accessToken: sessionForRevocation.accessToken,
      });
      revoked = true;
    } catch {
      // Clear the local session even if Django is unavailable. A later request
      // cannot refresh it from this browser because its cookie is removed.
    }
  }

  const response = revoked
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(
      { code: "logout_revocation_unavailable", detail: "La session locale a été supprimée, mais sa révocation serveur n’a pas pu être confirmée." },
      { status: 503 },
    );
  response.cookies.set(sessionCookieName, "", sessionCookieOptions(0));
  response.cookies.set(transactionCookieName, "", {
    ...transactionCookieOptions(config),
    httpOnly: true,
    maxAge: 0,
    path: transactionCookiePath,
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
