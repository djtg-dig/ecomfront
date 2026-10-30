import "server-only";

import { NextResponse } from "next/server";

import { BackendApiError, BackendNetworkError, BackendTimeoutError, backendClient, type QueryParameters } from "@/lib/api/backend-client";
import { refreshEcommerceSession } from "@/lib/auth/refresh";
import {
  decryptSession,
  encryptSession,
  sessionCookieName,
  sessionCookieOptions,
  type EcommerceSession,
} from "@/lib/auth/session";
import { requestCookie } from "@/lib/auth/security";

export class PrivateSessionError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 409 | 410 | 502 | 503, readonly code: string, detail: string, readonly fieldErrors?: Record<string, string[]>) {
    super(detail);
    this.name = "PrivateSessionError";
  }
}

export type AuthenticatedResult<T> = {
  data: T;
  session: EcommerceSession;
  refreshed: boolean;
};
type PrivateBackendOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; json?: unknown; rawBody?: ArrayBuffer; contentType?: string; query?: QueryParameters; headers?: Record<string, string> };

export function readPrivateSession(request: Request): EcommerceSession {
  const encrypted = requestCookie(request, sessionCookieName);
  const session = encrypted ? decryptSession(encrypted) : null;
  if (!session || session.refreshExpiresAt <= Date.now()) {
    throw new PrivateSessionError(401, "session_expired", "Votre session a expiré. Reconnectez-vous.");
  }
  return session;
}

export async function authenticatedBackendRequest<T>(
  path: string,
  session: EcommerceSession,
  options: PrivateBackendOptions = {},
): Promise<AuthenticatedResult<T>> {
  try {
    const data = await backendClient.request<T>(path, { ...options, accessToken: session.accessToken });
    if (data === undefined && options.method !== "DELETE") throw new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est indisponible.");
    return { data: data as T, session, refreshed: false };
  } catch (error) {
    if (!(error instanceof BackendApiError) || error.status !== 401) throw mapBackendError(error);
  }

  try {
    const refreshedSession = await refreshEcommerceSession(session, { force: true });
    const data = await backendClient.request<T>(path, { ...options, accessToken: refreshedSession.accessToken });
    if (data === undefined && options.method !== "DELETE") throw new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est indisponible.");
    return { data: data as T, session: refreshedSession, refreshed: true };
  } catch (error) {
    throw mapBackendError(error);
  }
}

function mapBackendError(error: unknown): PrivateSessionError {
  if (error instanceof PrivateSessionError) return error;
  if (error instanceof BackendApiError) {
    // Invitation links have intentionally user-facing, stable business errors.
    // Keep only this allow-list rather than making arbitrary Django error codes
    // part of the BFF contract.
    const invitationCodes = new Set([
      "carri_reauthentication_required",
      "verified_email_required",
      "invitation_recipient_mismatch",
      "invitation_expired",
      "invitation_revoked",
      "invitation_already_processed",
      "business_member_already_exists",
      "business_member_suspended",
      "business_member_removed",
      "business_member_removal_date_unknown",
      "invitation_precedes_member_removal",
      "invitation_delivery_unavailable",
      "invalid_invitation_token",
      "invitation_not_found",
      "CART_LOCKED",
    ]);
    if (error.code && invitationCodes.has(error.code) &&
        [400, 401, 403, 409, 410, 503].includes(error.status)) {
      return new PrivateSessionError(
        error.status as 400 | 401 | 403 | 409 | 410 | 503,
        error.code,
        error.detail,
      );
    }
    if (error.status === 400) return new PrivateSessionError(400, "invalid_request", error.detail, error.fieldErrors);
    if (error.status === 401) return new PrivateSessionError(401, "session_expired", "Votre session a expiré. Reconnectez-vous.");
    if (error.status === 403) return new PrivateSessionError(403, "access_forbidden", "Vous n’êtes pas autorisé à accéder à cette ressource.");
    if (error.status === 404) return new PrivateSessionError(403, "resource_not_allowed", "Cette ressource n’est pas accessible.");
    if (error.status === 409) return new PrivateSessionError(409, "conflict", error.detail);
    if (error.code && ["media_storage_permission_denied", "media_storage_unavailable"].includes(error.code) && [502, 503].includes(error.status)) {
      return new PrivateSessionError(error.status as 502 | 503, error.code, error.detail);
    }
    return new PrivateSessionError(503, "backend_unavailable", error.detail);
  }
  if (error instanceof BackendTimeoutError) return new PrivateSessionError(503, "backend_timeout", error.message);
  if (error instanceof BackendNetworkError) return new PrivateSessionError(503, "backend_unavailable", error.message);
  return new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
}

export function persistPrivateSession(response: NextResponse, session: EcommerceSession): NextResponse {
  response.cookies.set(
    sessionCookieName,
    encryptSession(session),
    sessionCookieOptions(Math.floor((session.refreshExpiresAt - Date.now()) / 1000)),
  );
  return response;
}

export function clearPrivateSession(response: NextResponse): NextResponse {
  response.cookies.set(sessionCookieName, "", sessionCookieOptions(0));
  return response;
}
