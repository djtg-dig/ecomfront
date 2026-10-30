import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { privateEmpty, privateFailure, privateJson } from "@/lib/api/private-route";

async function proxy(request: Request, context: RouteContext<"/api/private/carts/[...path]">) {
  try {
    const { path } = await context.params;
    const suffix = (path ?? []).join("/");
    if (!/^[A-Za-z0-9_/-]{0,180}$/.test(suffix)) return NextResponse.json({ detail: "Route invalide." }, { status: 400 });
    if (request.method !== "GET" && !isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ detail: "Action non autorisée." }, { status: 403 });
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const result = await authenticatedBackendRequest<unknown>(`/api/v1/carts/${suffix ? `${suffix}/` : ""}`, readPrivateSession(request), { method: request.method as "GET" | "POST" | "PATCH" | "DELETE", query, ...(request.method === "GET" || request.method === "DELETE" ? {} : { json: await request.json() }) });
    return request.method === "DELETE" ? privateEmpty(result) : privateJson(result, result.data, request.method === "POST" ? 201 : 200);
  } catch (error) { return privateFailure(error); }
}
export const GET = proxy; export const POST = proxy; export const PATCH = proxy; export const DELETE = proxy;
