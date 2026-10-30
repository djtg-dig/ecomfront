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
  const destination = new URL("/api/v1/auth/carri/login/", config.backendUrl);
  destination.searchParams.set("delivery", "nextjs");
  destination.searchParams.set("delivery_binding", binding);

  // The OAuth start endpoint is normally a browser navigation. Probe it from
  // the BFF first so a provider outage never renders Django's technical API UI.
  let upstream: Response;
  try {
    upstream = await fetch(destination, { redirect: "manual", headers: { Accept: "text/html" } });
  } catch {
    return NextResponse.redirect(new URL("/auth/indisponible", config.frontendUrl), 303);
  }
  if (upstream.status >= 500) {
    console.error("[auth] OAuth provider start unavailable", { status: upstream.status });
    return NextResponse.redirect(new URL("/auth/indisponible", config.frontendUrl), 303);
  }
  const providerLocation = upstream.headers.get("location");
  if (!providerLocation || upstream.status < 300 || upstream.status >= 400) {
    return NextResponse.redirect(new URL("/connexion?erreur=oauth_configuration_unavailable", config.frontendUrl), 303);
  }
  const response = NextResponse.redirect(providerLocation, 303);
  response.cookies.set(transactionCookieName, binding, {
    ...cookiePolicy,
    httpOnly: true,
    maxAge: 600,
    path: transactionCookiePath,
    priority: "high",
  });
  const returnTo = safePrivateReturnTo(new URL(request.url).searchParams.get("retour"), config.frontendUrl);
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
