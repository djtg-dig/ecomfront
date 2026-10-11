import { NextResponse } from "next/server";

import {
  PrivateSessionError,
  authenticatedBackendRequest,
  clearPrivateSession,
  persistPrivateSession,
  readPrivateSession,
} from "@/lib/auth/private-session";
import { selectedBusinessFromRequest } from "@/lib/private/business-selection";

type Identity = { id: string; carri_subject: string };
type Business = { public_id: string; name: string; status: string; primary_currency: string };

function errorResponse(error: PrivateSessionError) {
  const response = NextResponse.json({ code: error.code, detail: error.message }, { status: error.status });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return error.status === 401 ? clearPrivateSession(response) : response;
}

export async function GET(request: Request) {
  try {
    const session = readPrivateSession(request);
    const identity = await authenticatedBackendRequest<Identity>("/api/v1/auth/me/", session);
    const businesses = await authenticatedBackendRequest<Business[]>("/api/v1/businesses/", identity.session);
    const selectedBusinessId = selectedBusinessFromRequest(request);
    const selectedIsAccessible = businesses.data.some((business) => business.public_id === selectedBusinessId);
    const response = NextResponse.json({
      identity: identity.data,
      businesses: businesses.data,
      selectedBusinessId: selectedIsAccessible ? selectedBusinessId : null,
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return businesses.refreshed || identity.refreshed ? persistPrivateSession(response, businesses.session) : response;
  } catch (error) {
    return errorResponse(error instanceof PrivateSessionError
      ? error
      : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible."));
  }
}
