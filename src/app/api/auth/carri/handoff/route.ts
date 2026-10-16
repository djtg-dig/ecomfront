import { NextResponse } from "next/server";

import { BackendApiError, BackendNetworkError, backendClient } from "@/lib/api/backend-client";
import {
  createEcommerceSession,
  encryptSession,
  sessionCookieName,
  sessionCookieOptions,
  type EcommerceTokenPair,
} from "@/lib/auth/session";
import {
  requestCookie,
  secureEquals,
  isLocalSameSiteConfig,
  transactionCookieName,
  transactionCookieOptions,
  transactionCookiePath,
} from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invitationReturnCookieName } from "@/lib/auth/invitation-context";

const DELIVERY_ERROR_CODES = new Set([
  "oauth_login_csrf_detected",
  "oauth_state_invalid_or_expired",
  "oauth_configuration_unavailable",
  "oauth_provider_unavailable",
  "oauth_authorization_denied",
  "oauth_email_not_verified",
  "oauth_proof_invalid",
  "oauth_callback_invalid",
  "handoff_delivery_destination_not_allowed",
  "handoff_delivery_binding_invalid",
  "handoff_missing",
  "handoff_invalid",
  "handoff_expired",
  "handoff_already_consumed",
  "handoff_client_not_authorized",
]);

const CALLBACK_ERROR_CODES: Record<string, string> = {
  access_denied: "oauth_authorization_denied",
  oauth_authorization_denied: "oauth_authorization_denied",
  oauth_email_not_verified: "oauth_email_not_verified",
  oauth_login_csrf_detected: "oauth_login_csrf_detected",
  oauth_state_invalid_or_expired: "oauth_state_invalid_or_expired",
  oauth_callback_invalid: "oauth_callback_invalid",
};

function returnToLogin(config: ReturnType<typeof getServerConfig>, code: string) {
  const response = NextResponse.redirect(
    new URL(`/connexion?erreur=${encodeURIComponent(code)}`, config.frontendUrl),
    303,
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function clearTransactionCookie(response: NextResponse, config: ReturnType<typeof getServerConfig>) {
  response.cookies.set(transactionCookieName, "", {
    ...transactionCookieOptions(config),
    httpOnly: true,
    maxAge: 0,
    path: transactionCookiePath,
  });
  return response;
}

export async function POST(request: Request) {
  let config;
  try {
    config = getServerConfig();
  } catch {
    return new Response("Service temporairement indisponible.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const originAllowed = origin === config.backendUrl ||
    (origin === "null" && fetchSite === "same-site" && isLocalSameSiteConfig(config));
  if (!originAllowed) {
    return returnToLogin(config, "handoff_delivery_origin_invalid");
  }
  if (!["same-origin", "same-site", "cross-site"].includes(fetchSite ?? "")) {
    return returnToLogin(config, "handoff_delivery_context_invalid");
  }

  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
    return returnToLogin(config, "handoff_delivery_invalid");
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return returnToLogin(config, "handoff_delivery_invalid");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return returnToLogin(config, "handoff_delivery_invalid");
  }
  const formKeys = [...form.keys()];
  const hasHandoff = formKeys.length === 2 && form.getAll("handoff").length === 1 &&
    form.getAll("error").length === 0;
  const hasCallbackError = formKeys.length === 2 && form.getAll("error").length === 1 &&
    form.getAll("handoff").length === 0;
  if (
    form.getAll("delivery_binding").length !== 1 ||
    (!hasHandoff && !hasCallbackError)
  ) {
    return returnToLogin(config, "handoff_delivery_invalid");
  }

  const handoff = form.get("handoff");
  const callbackError = form.get("error");
  const binding = form.get("delivery_binding");
  const cookieBinding = requestCookie(request, transactionCookieName);
  if (
    typeof binding !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(binding) ||
    !cookieBinding || !secureEquals(binding, cookieBinding)
  ) {
    return returnToLogin(config, "handoff_delivery_binding_invalid");
  }

  if (hasCallbackError) {
    const code = typeof callbackError === "string" &&
      Object.hasOwn(CALLBACK_ERROR_CODES, callbackError)
      ? CALLBACK_ERROR_CODES[callbackError]
      : undefined;
    if (!code) {
      return returnToLogin(config, "handoff_delivery_invalid");
    }
    return clearTransactionCookie(returnToLogin(config, code), config);
  }

  if (typeof handoff !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(handoff)) {
    return returnToLogin(config, "handoff_delivery_invalid");
  }

  try {
    const tokens = await backendClient.request<EcommerceTokenPair>(
      "/api/v1/auth/carri/handoff/consume/",
      { method: "POST", json: { handoff } },
    );
    if (!tokens) {
      return returnToLogin(config, "handoff_delivery_failed");
    }

    const session = createEcommerceSession(tokens);
    const encrypted = encryptSession(session);
    const response = NextResponse.redirect(new URL("/espace", config.frontendUrl), 303);
    response.cookies.set(sessionCookieName, encrypted, sessionCookieOptions(
      Math.floor((session.refreshExpiresAt - Date.now()) / 1000),
    ));
    clearTransactionCookie(response, config);
    // Remove the legacy marker if a browser still has one from an older flow.
    response.cookies.set(invitationReturnCookieName, "", sessionCookieOptions(0));
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    const backendCode = error instanceof BackendApiError ? error.code : null;
    const code = error instanceof BackendNetworkError ||
      (error instanceof BackendApiError && error.status >= 500)
      ? "backend_unavailable"
      : backendCode && DELIVERY_ERROR_CODES.has(backendCode)
        ? backendCode
        : "handoff_delivery_failed";
    const response = returnToLogin(config, code);
    return clearTransactionCookie(response, config);
  }
}
