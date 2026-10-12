import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

const actions = new Set(["suspend", "reactivate"]);

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string; memberId: string; action: string }> }) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const { businessId, memberId, action } = await params;
    if (!validPrivateIdentifier(businessId) || !validPrivateIdentifier(memberId)) return invalidIdentifier("Identifiant d’entreprise ou de membre invalide.");
    if (!actions.has(action)) return invalidIdentifier("Action sur le membre invalide.");
    const result = await authenticatedBackendRequest<unknown>(
      `/api/v1/businesses/${businessId}/members/${memberId}/${action}/`,
      readPrivateSession(request),
      { method: "POST", json: {} },
    );
    return privateJson(result, { member: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}
