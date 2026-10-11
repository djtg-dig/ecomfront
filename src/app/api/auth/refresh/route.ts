import { NextResponse } from "next/server";

import { BackendApiError, BackendNetworkError } from "@/lib/api/backend-client";
import { refreshEcommerceSession } from "@/lib/auth/refresh";
import {
  decryptSession,
  encryptSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { isSameOriginMutation, requestCookie } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

export async function POST(request: Request) {
  let config;
  try {
    config = getServerConfig();
  } catch {
    return Response.json(
      { code: "configuration_unavailable", detail: "Le service de session est indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isSameOriginMutation(request, config)) {
    return Response.json(
      { code: "csrf_rejected", detail: "La requête de session n'est pas autorisée." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const encrypted = requestCookie(request, sessionCookieName);
  const session = encrypted ? decryptSession(encrypted) : null;
  if (!session || session.refreshExpiresAt <= Date.now()) {
    const response = NextResponse.json(
      { code: "session_expired", detail: "Votre session a expiré. Reconnectez-vous." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(sessionCookieName, "", sessionCookieOptions(0));
    return response;
  }

  try {
    const refreshed = await refreshEcommerceSession(session);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(
      sessionCookieName,
      encryptSession(refreshed),
      sessionCookieOptions(Math.floor((refreshed.refreshExpiresAt - Date.now()) / 1000)),
    );
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    if (error instanceof BackendApiError && [400, 401].includes(error.status)) {
      const response = NextResponse.json(
        { code: "session_expired", detail: "Votre session a expiré. Reconnectez-vous." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
      response.cookies.set(sessionCookieName, "", sessionCookieOptions(0));
      return response;
    }
    return Response.json(
      {
        code: "session_refresh_unavailable",
        detail: error instanceof BackendNetworkError
          ? error.message
          : "Le renouvellement de session est temporairement indisponible.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}