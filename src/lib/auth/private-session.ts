import "server-only";

import { NextResponse } from "next/server";

import { BackendApiError, BackendNetworkError, backendClient, type QueryParameters } from "@/lib/api/backend-client";
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
  constructor(readonly status: 400 | 401 | 403 | 409 | 503, readonly code: string, detail: string) {
    super(detail);
    this.name = "PrivateSessionError";
  }
}

export type AuthenticatedResult<T> = {
  data: T;
  session: EcommerceSession;
  refreshed: boolean;
};
type PrivateBackendOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; json?: unknown; query?: QueryParameters; headers?: Record<string, string> };

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
    if (error.status === 400) return new PrivateSessionError(400, "invalid_request", error.detail);
    if (error.status === 401) return new PrivateSessionError(401, "session_expired", "Votre session a expiré. Reconnectez-vous.");
    if (error.status === 403) return new PrivateSessionError(403, "access_forbidden", "Vous n’êtes pas autorisé à accéder à cette ressource.");
    if (error.status === 404) return new PrivateSessionError(403, "resource_not_allowed", "Cette ressource n’est pas accessible.");
    if (error.status === 409) return new PrivateSessionError(409, "conflict", error.detail);
    return new PrivateSessionError(503, "backend_unavailable", error.detail);
  }
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
