import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { DELETE as remove, GET as detail, PATCH as update } from "@/app/api/private/businesses/[businessId]/members/[memberId]/route";
import { POST as lifecycle } from "@/app/api/private/businesses/[businessId]/members/[memberId]/[action]/route";
import { DELETE as revoke } from "@/app/api/private/businesses/[businessId]/members/[memberId]/permissions/[permission]/route";
import { POST as grant } from "@/app/api/private/businesses/[businessId]/members/[memberId]/permissions/route";
import { GET as catalog } from "@/app/api/private/businesses/[businessId]/permission-catalog/route";
import { BackendApiError, BackendNetworkError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontend = "http://localhost:3001";
const businessId = "BUS123";
const memberId = "MEM456";
const context = { params: Promise.resolve({ businessId, memberId }) };

function jwt(exp: number) { return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`; }
function session(): EcommerceSession { return { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400), accessExpiresAt: Date.now() + 900_000, refreshExpiresAt: Date.now() + 86_400_000 }; }
function request(path: string, init: RequestInit = {}) {
  return new Request(`${frontend}${path}`, { ...init, headers: { cookie: `ecommerce_session=${encryptSession(session())}`, ...init.headers } });
}
function mutation(path: string, init: RequestInit = {}) {
  return request(path, { ...init, headers: { origin: frontend, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", ...init.headers } });
}

beforeEach(() => {
  vi.unstubAllEnvs(); vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontend); vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000");
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web"); vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("NODE_ENV", "development");
});

describe("routes BFF d’administration des membres", () => {
  it("relaie le détail, le titre, le cycle de vie et les permissions sans JWT", async () => {
    const member = { public_id: memberId, title: "Caissier", is_owner: false, status: "ACTIVE", permissions: [] };
    mocks.request.mockResolvedValueOnce(member);
    expect((await detail(request(`/api/private/businesses/${businessId}/members/${memberId}`), context)).status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/members/${memberId}/`, expect.objectContaining({ accessToken: expect.any(String) }));

    mocks.request.mockResolvedValueOnce({ ...member, title: "Responsable caisse" });
    const updated = await update(mutation(`/api/private/businesses/${businessId}/members/${memberId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Responsable caisse" }) }), context);
    expect(updated.status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/members/${memberId}/`, expect.objectContaining({ method: "PATCH", json: { title: "Responsable caisse" } }));

    mocks.request.mockResolvedValueOnce({ ...member, status: "SUSPENDED" });
    const suspended = await lifecycle(mutation(`/api/private/businesses/${businessId}/members/${memberId}/suspend`, { method: "POST" }), { params: Promise.resolve({ businessId, memberId, action: "suspend" }) });
    expect(suspended.status).toBe(200);

    mocks.request.mockResolvedValueOnce({ permission: "SALE_CREATE" });
    expect((await grant(mutation(`/api/private/businesses/${businessId}/members/${memberId}/permissions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ permission: "SALE_CREATE" }) }), context)).status).toBe(201);

    mocks.request.mockResolvedValueOnce(undefined);
    expect((await revoke(mutation(`/api/private/businesses/${businessId}/members/${memberId}/permissions/SALE_CREATE`, { method: "DELETE" }), { params: Promise.resolve({ businessId, memberId, permission: "SALE_CREATE" }) })).status).toBe(204);

    mocks.request.mockResolvedValueOnce([{ permission: "SALE_CREATE", label: "Create sales" }]);
    expect((await catalog(request(`/api/private/businesses/${businessId}/permission-catalog`), { params: Promise.resolve({ businessId }) })).status).toBe(200);
  });

  it("bloque CSRF et identifiants/actions invalides avant le backend", async () => {
    expect((await remove(request(`/api/private/businesses/${businessId}/members/${memberId}`, { method: "DELETE" }), context)).status).toBe(403);
    expect((await lifecycle(mutation("/api/private/businesses/x/members/y/promote", { method: "POST" }), { params: Promise.resolve({ businessId: "x", memberId: "y", action: "promote" }) })).status).toBe(400);
    expect((await detail(request("/api/private/businesses/../members/x"), { params: Promise.resolve({ businessId: "../", memberId: "x" }) })).status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("efface la session et renvoie 401 lorsqu’elle est absente", async () => {
    const response = await detail(new Request(`${frontend}/api/private/businesses/${businessId}/members/${memberId}`), context);
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("session_expired");
    expect(response.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
  });

  it.each([
    [400, 400, "invalid_request"], [403, 403, "access_forbidden"], [404, 403, "resource_not_allowed"], [409, 409, "conflict"],
  ])("normalise l’erreur backend %i", async (backendStatus, expectedStatus, code) => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(backendStatus, "backend", "Refus backend"));
    const response = await detail(request(`/api/private/businesses/${businessId}/members/${memberId}`), context);
    expect(response.status).toBe(expectedStatus);
    expect((await response.json()).code).toBe(code);
  });

  it("normalise une indisponibilité backend en 503", async () => {
    mocks.request.mockRejectedValueOnce(new BackendNetworkError());
    expect((await detail(request(`/api/private/businesses/${businessId}/members/${memberId}`), context)).status).toBe(503);
  });
});
