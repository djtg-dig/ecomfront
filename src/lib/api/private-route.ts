import "server-only";

import { NextResponse } from "next/server";

import {
  PrivateSessionError,
  clearPrivateSession,
  persistPrivateSession,
  type AuthenticatedResult,
} from "@/lib/auth/private-session";

export const validPrivateIdentifier = (value: string) => /^[A-Za-z0-9_-]{1,64}$/.test(value);

export function invalidIdentifier(detail: string) {
  return NextResponse.json({ code: "invalid_identifier", detail }, { status: 400 });
}

export function privateFailure(error: unknown) {
  const safeError = error instanceof PrivateSessionError
    ? error
    : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
  const response = NextResponse.json({ code: safeError.code, detail: safeError.message }, { status: safeError.status });
  return safeError.status === 401 ? clearPrivateSession(response) : response;
}

export function privateJson<T>(result: AuthenticatedResult<T>, body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  return result.refreshed ? persistPrivateSession(response, result.session) : response;
}

export function privateEmpty(result: AuthenticatedResult<unknown>) {
  const response = new NextResponse(null, { status: 204 });
  return result.refreshed ? persistPrivateSession(response, result.session) : response;
}
