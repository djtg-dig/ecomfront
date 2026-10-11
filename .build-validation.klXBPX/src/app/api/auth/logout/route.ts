import { NextResponse } from "next/server";

import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import {
  isSameOriginMutation,
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

  const response = new NextResponse(null, { status: 204 });
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