import { NextResponse } from "next/server";

import {
  PrivateSessionError,
  authenticatedBackendRequest,
  clearPrivateSession,
  persistPrivateSession,
  readPrivateSession,
} from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";

const validIdentifier = (value: string) => /^[A-Za-z0-9_-]{1,64}$/.test(value);

function failure(error: unknown) {
  const safeError = error instanceof PrivateSessionError
    ? error
    : new PrivateSessionError(503, "backend_unavailable", "Le service E-commerce est temporairement indisponible.");
  const response = NextResponse.json({ code: safeError.code, detail: safeError.message }, { status: safeError.status });
  return safeError.status === 401 ? clearPrivateSession(response) : response;
}

function invalidBusinessId() {
  return NextResponse.json({ code: "invalid_business_id", detail: "Identifiant d’entreprise invalide." }, { status: 400 });
}

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validIdentifier(businessId)) return invalidBusinessId();

    const access = await authenticatedBackendRequest<{ permissions: string[] }>(
      `/api/v1/businesses/${businessId}/my-permissions/`,
      readPrivateSession(request),
    );
    let session = access.session;
    let refreshed = access.refreshed;
    const [membersResult, invitationsResult] = await Promise.all([
      access.data.permissions.includes("MEMBER_VIEW")
        ? authenticatedBackendRequest<unknown>(
        `/api/v1/businesses/${businessId}/members/`,
        session,
        { query: { page: "1", page_size: "50" } },
      )
        : Promise.resolve(null),
      access.data.permissions.includes("INVITATION_VIEW")
        ? authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/invitations/`, session)
        : Promise.resolve(null),
    ]);
    const members = membersResult?.data ?? [];
    const invitations = invitationsResult?.data ?? [];
    for (const result of [membersResult, invitationsResult]) {
      if (result?.refreshed) {
        session = result.session;
        refreshed = true;
      }
    }
    const response = NextResponse.json({ members, invitations });
    return refreshed ? persistPrivateSession(response, session) : response;
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) {
      return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    }
    const { businessId } = await params;
    if (!validIdentifier(businessId)) return invalidBusinessId();

    const result = await authenticatedBackendRequest<unknown>(
      `/api/v1/businesses/${businessId}/invitations/`,
      readPrivateSession(request),
      { method: "POST", json: await request.json() },
    );
    const response = NextResponse.json({ invitation: result.data }, { status: 201 });
    return result.refreshed ? persistPrivateSession(response, result.session) : response;
  } catch (error) {
    return failure(error);
  }
}
