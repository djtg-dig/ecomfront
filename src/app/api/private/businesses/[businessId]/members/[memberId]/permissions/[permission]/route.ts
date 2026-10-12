import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateEmpty, privateFailure, validPrivateIdentifier } from "@/lib/api/private-route";

export async function DELETE(request: Request, { params }: { params: Promise<{ businessId: string; memberId: string; permission: string }> }) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const { businessId, memberId, permission } = await params;
    if (!validPrivateIdentifier(businessId) || !validPrivateIdentifier(memberId) || !validPrivateIdentifier(permission)) return invalidIdentifier("Identifiant ou permission invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/members/${memberId}/permissions/${permission}/`, readPrivateSession(request), { method: "DELETE" });
    return privateEmpty(result);
  } catch (error) {
    return privateFailure(error);
  }
}
