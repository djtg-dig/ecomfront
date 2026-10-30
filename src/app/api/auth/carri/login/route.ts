import { randomBytes } from "node:crypto";
import { connection, NextResponse } from "next/server";

import { assertSessionEncryptionConfigured } from "@/lib/auth/session";
import {
  transactionCookieName,
  transactionCookieOptions,
  transactionCookiePath,
  returnToCookieName,
  safePrivateReturnTo,
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
  } catch (error) {
    // Keep the diagnostic code on the server without exposing configuration
    // details to the browser.
    console.error("[auth] OAuth transport configuration rejected", error);
    return NextResponse.redirect(new URL("/connexion?erreur=configuration_https", config.frontendUrl), 303);
  }

  const binding = randomBytes(32).toString("base64url");
  const returnTo = safePrivateReturnTo(new URL(request.url).searchParams.get("retour"), config.frontendUrl);
  const destination = new URL("/api/v1/auth/carri/login/", config.backendUrl);
  destination.searchParams.set("delivery", "nextjs");
  destination.searchParams.set("delivery_binding", binding);
  // Django must receive this browser navigation directly: it creates the
  // HttpOnly OAuth-attempt cookie that binds the later callback to this browser.
  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(transactionCookieName, binding, {
    ...cookiePolicy,
    httpOnly: true,
    maxAge: 600,
    path: transactionCookiePath,
    priority: "high",
  });
  if (returnTo) {
    response.cookies.set(returnToCookieName, returnTo, {
      ...cookiePolicy,
      httpOnly: true,
      maxAge: 600,
      path: transactionCookiePath,
      priority: "high",
    });
  }
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
