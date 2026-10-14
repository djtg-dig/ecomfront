import { NextResponse } from "next/server";

import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

function query(request: Request) {
  const source = new URL(request.url).searchParams;
  const page = source.get("page");
  const pageSize = source.get("page_size");
  const ordering = source.get("ordering");
  if (page && !/^\d+$/.test(page)) return null;
  if (pageSize && (!/^\d+$/.test(pageSize) || Number(pageSize) > 100)) return null;
  if (ordering && !["name", "-name", "created_at", "-created_at"].includes(ordering)) return null;
  return { q: source.get("q")?.slice(0, 200) || undefined, ordering: ordering || undefined, page: page || "1", page_size: pageSize || undefined };
}

export async function GET(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    const filters = query(request);
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    if (!filters) return NextResponse.json({ code: "invalid_request", detail: "Filtres invalides." }, { status: 400 });
    const result = await authenticatedBackendRequest<Page<unknown>>(`/api/v1/businesses/${businessId}/customers/`, readPrivateSession(request), { query: filters });
    return privateJson(result, { customers: result.data.results, pagination: { count: result.data.count, next: result.data.next, previous: result.data.previous } });
  } catch (error) { return privateFailure(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
    const { businessId } = await params;
    if (!validPrivateIdentifier(businessId)) return invalidIdentifier("Identifiant d’entreprise invalide.");
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/businesses/${businessId}/customers/`, readPrivateSession(request), { method: "POST", json: await request.json() });
    return privateJson(result, { customer: result.data }, 201);
  } catch (error) { return privateFailure(error); }
}
