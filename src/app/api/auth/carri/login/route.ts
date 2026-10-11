import { randomBytes } from "node:crypto";
import { connection, NextResponse } from "next/server";

import { assertSessionEncryptionConfigured } from "@/lib/auth/session";
import {
  transactionCookieName,
  transactionCookieOptions,
  transactionCookiePath,
} from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

export async function GET(request: Request) {
  await connection();
  let config;
  try {
    config = getServerConfig();
    if (new URL(request.url).origin !== config.frontendUrl) {
      return NextResponse.redirect(new URL("/connexion?erreur=origine_invalide", config.frontendUrl), 303);
    }
    assertSessionEncryptionConfigured();
  } catch {
    const fallback = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/connexion?erreur=configuration_locale", fallback), 303);
  }

  let cookiePolicy;
  try {
    cookiePolicy = transactionCookieOptions(config);
  } catch {
    return NextResponse.redirect(new URL("/connexion?erreur=configuration_https", config.frontendUrl), 303);
  }

  const binding = randomBytes(32).toString("base64url");
  const destination = new URL("/api/v1/auth/carri/login/", config.backendUrl);
  destination.searchParams.set("delivery", "nextjs");
  destination.searchParams.set("delivery_binding", binding);

  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(transactionCookieName, binding, {
    ...cookiePolicy,
    httpOnly: true,
    maxAge: 600,
    path: transactionCookiePath,
    priority: "high",
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}