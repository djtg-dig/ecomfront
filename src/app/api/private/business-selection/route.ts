import { NextResponse } from "next/server";

import { BackendApiError } from "@/lib/api/backend-client";
import {
  PrivateSessionError,
  authenticatedBackendRequest,
  clearPrivateSession,
  persistPrivateSession,
  readPrivateSession,
} from "@/lib/auth/private-session";
import { sessionCookieOptions } from "@/lib/auth/session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { selectedBusinessCookieName } from "@/lib/private/business-selection";

type Business = { public_id: string; name: string; status: string; primary_currency: string };

function errorResponse(error: PrivateSessionError) {
  const response = NextResponse.json({ code: error.code, detail: error.message }, { status: error.status });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return error.status === 401 ? clearPrivateSession(response) : response;
}

export async function POST(request: Request) {
  try {
    const config = getServerConfig();
    if (!isSameOriginMutation(request, config)) {
      return NextResponse.json({ code: "csrf_rejected", detail: "La sélection n’est pas autorisée." }, { status: 403 });
    }
    const body = await request.json() as { businessId?: unknown };
    if (typeof body.businessId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(body.businessId)) {
      return NextResponse.json({ code: "invalid_business", detail: "Entreprise invalide." }, { status: 400 });
    }
    const session = readPrivateSession(request);
    const result = await authenticatedBackendRequest<Business>(`/api/v1/businesses/${body.businessId}/`, session);
    const response = NextResponse.json({ business: result.data });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.cookies.set(selectedBusinessCookieName, result.data.public_id, {
      ...sessionCookieOptions(60 * 60 * 24 * 30),
      httpOnly: true,
    });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) {
    // The backend deliberately responds 404 for an out-of-scope business.
    // Keep that non-disclosure property while returning a useful BFF error.
    if ((error instanceof BackendApiError && error.status === 404) ||
        (error instanceof PrivateSessionError && error.code === "resource_not_allowed")) {
      return NextResponse.json(
        { code: "business_not_allowed", detail: "Cette entreprise n’est pas accessible." },
        { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    return errorResponse(error instanceof PrivateSessionError
      ? error
      : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible."));
  }
}
