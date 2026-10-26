import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Page = { count: number; next: string | null; previous: string | null; results: unknown[] };

/** Relay the tenant-scoped POS projection; the browser never sees backend credentials. */
export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const source = new URL(request.url).searchParams;
    const q = source.get("q")?.trim();
    const pageSize = source.get("page_size") ?? "20";
    if (!q || q.length > 200 || !/^\d+$/.test(pageSize) || Number(pageSize) < 1 || Number(pageSize) > 50) {
      return NextResponse.json({ code: "invalid_request", detail: "Recherche POS invalide." }, { status: 400 });
    }
    const result = await authenticatedBackendRequest<Page>(
      `/api/v1/businesses/${businessId}/products/pos/search/`,
      readPrivateSession(request),
      { query: { q, page_size: pageSize } },
    );
    return privateJson(result, {
      products: result.data.results,
      pagination: { count: result.data.count, next: result.data.next, previous: result.data.previous },
    });
  } catch (error) {
    return privateFailure(error);
  }
}
