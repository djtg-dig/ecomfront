import { NextResponse } from "next/server";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";

function safeSegments(segments: string[]) { return segments.every(validPrivateIdentifier); }
function backendPath(segments: string[]) {
  if (segments[0] === "sellers" && segments.length === 2) return `/api/v1/public/businesses/${segments[1]}/messaging-sellers/`;
  return `/api/v1/messaging/${segments.join("/")}/`;
}

async function handle(request: Request, segments: string[]) {
  if (!safeSegments(segments)) return invalidIdentifier("Identifiant de messagerie invalide.");
  const method = request.method as "GET" | "POST";
  if (method === "POST" && !isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "Action non autorisée." }, { status: 403 });
  let options: { method: "POST"; json?: unknown; rawBody?: ArrayBuffer; contentType?: string } | undefined;
  if (method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) options = { method, rawBody: await request.arrayBuffer(), contentType };
    else { const raw = await request.text(); options = { method, json: raw ? JSON.parse(raw) : {} }; }
  }
  const result = await authenticatedBackendRequest<unknown>(backendPath(segments), readPrivateSession(request), options);
  return privateJson(result, result.data, method === "POST" && segments.at(-1) === "websocket-ticket" ? 201 : 200);
}

export async function GET(request: Request, { params }: { params: Promise<{ segments: string[] }> }) { try { return await handle(request, (await params).segments); } catch (error) { return privateFailure(error); } }
export async function POST(request: Request, { params }: { params: Promise<{ segments: string[] }> }) { try { return await handle(request, (await params).segments); } catch (error) { return privateFailure(error); } }
