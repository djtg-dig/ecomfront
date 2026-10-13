import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return NextResponse.json({ code: "invalid_identifier", detail: "Entreprise invalide." }, { status: 400 });
    const result = await authenticatedBackendRequest<{ member_status: string; permissions: string[] }>(`/api/v1/businesses/${businessId}/my-permissions/`, readPrivateSession(request));
    return privateJson(result, result.data);
  } catch (error) { return privateFailure(error); }
}
