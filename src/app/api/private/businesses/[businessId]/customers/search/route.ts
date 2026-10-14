import { NextResponse } from "next/server";

import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const source = new URL(request.url).searchParams; const pageSize = source.get("page_size") ?? "20";
    if (!/^\d+$/.test(pageSize) || Number(pageSize) > 50) return NextResponse.json({ code: "invalid_request", detail: "Pagination invalide." }, { status: 400 });
    const result = await authenticatedBackendRequest<Page<unknown>>(`/api/v1/businesses/${businessId}/customers/pos/search/`, readPrivateSession(request), { query: { q: source.get("q")?.slice(0, 200) || undefined, page_size: pageSize } });
    return privateJson(result, { customers: result.data.results, pagination: { count: result.data.count, next: result.data.next, previous: result.data.previous } });
  } catch (error) { return privateFailure(error); }
}
