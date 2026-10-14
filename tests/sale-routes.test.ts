import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/backend-client", async (importOriginal) => { const actual = await importOriginal<typeof import("@/lib/api/backend-client")>(); return { ...actual, backendClient: { request: mocks.request } }; });

import { POST as action } from "@/app/api/private/businesses/[businessId]/sales/[saleId]/[action]/route";
import { GET as lines, POST as createLine } from "@/app/api/private/businesses/[businessId]/sales/[saleId]/lines/route";
import { GET as detail } from "@/app/api/private/businesses/[businessId]/sales/[saleId]/route";
import { GET as sales, POST as createSale } from "@/app/api/private/businesses/[businessId]/sales/route";
import { GET as customers, POST as createCustomer } from "@/app/api/private/businesses/[businessId]/customers/route";
import { BackendApiError, BackendNetworkError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontend = "http://localhost:3001"; const businessId = "BUS123"; const saleId = "SA456"; const saleContext = { params: Promise.resolve({ businessId, saleId }) }; const businessContext = { params: Promise.resolve({ businessId }) };
function jwt(exp: number) { return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`; }
function session(): EcommerceSession { return { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400), accessExpiresAt: Date.now() + 900_000, refreshExpiresAt: Date.now() + 86_400_000 }; }
function request(path: string, init: RequestInit = {}) { return new Request(`${frontend}${path}`, { ...init, headers: { cookie: `ecommerce_session=${encryptSession(session())}`, ...init.headers } }); }
function mutation(path: string, init: RequestInit = {}) { return request(path, { ...init, headers: { origin: frontend, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", ...init.headers } }); }
beforeEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontend); vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000"); vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web"); vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret"); vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("NODE_ENV", "development"); });

describe("routes BFF ventes", () => {
  it("relaie clients, brouillons, lignes et finalisation sans exposer de JWT", async () => {
    mocks.request.mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{ public_id: "CU1", name: "Client" }] }); expect((await customers(request(`/api/private/businesses/${businessId}/customers`), businessContext)).status).toBe(200);
    mocks.request.mockResolvedValueOnce({ public_id: "CU1", name: "Client" }); expect((await createCustomer(mutation(`/api/private/businesses/${businessId}/customers`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Client" }) }), businessContext)).status).toBe(201);
    mocks.request.mockResolvedValueOnce({ public_id: saleId, status: "DRAFT" }); expect((await createSale(mutation(`/api/private/businesses/${businessId}/sales`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer: "CU1" }) }), businessContext)).status).toBe(201);
    mocks.request.mockResolvedValueOnce({ public_id: "SL1", product: "PR1" }); expect((await createLine(mutation(`/api/private/businesses/${businessId}/sales/${saleId}/lines`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: "PR1", quantity: "2" }) }), saleContext)).status).toBe(201);
    mocks.request.mockResolvedValueOnce({ public_id: saleId, status: "COMPLETED" }); expect((await action(mutation(`/api/private/businesses/${businessId}/sales/${saleId}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount_paid: "10", payment_method: "CASH" }) }), { params: Promise.resolve({ businessId, saleId, action: "complete" }) })).status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/sales/${saleId}/complete/`, expect.objectContaining({ method: "POST", json: { amount_paid: "10", payment_method: "CASH" } }));
  });
  it("bloque CSRF et les identifiants produit/client invalides avant Django", async () => {
    expect((await createSale(mutation(`/api/private/businesses/${businessId}/sales`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer: "../" }) }), businessContext)).status).toBe(400);
    expect((await createLine(mutation(`/api/private/businesses/${businessId}/sales/${saleId}/lines`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: "PR1", variant: "PV1", quantity: "1" }) }), saleContext)).status).toBe(400);
    expect((await action(request(`/api/private/businesses/${businessId}/sales/${saleId}/cancel`, { method: "POST" }), { params: Promise.resolve({ businessId, saleId, action: "cancel" }) })).status).toBe(403);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("protège la session absente et les ventes hors périmètre", async () => {
    const absent = await detail(new Request(`${frontend}/api/private/businesses/${businessId}/sales/${saleId}`), saleContext); expect(absent.status).toBe(401); expect(absent.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
    mocks.request.mockRejectedValueOnce(new BackendApiError(404, "not_found", "Inconnue")); const foreign = await detail(request(`/api/private/businesses/OTHER999/sales/${saleId}`), { params: Promise.resolve({ businessId: "OTHER999", saleId }) }); expect(foreign.status).toBe(403); expect((await foreign.json()).code).toBe("resource_not_allowed");
  });
  it.each([[400, 400, "invalid_request"], [403, 403, "access_forbidden"], [404, 403, "resource_not_allowed"], [409, 409, "conflict"]])("normalise l’erreur Django %i", async (backendStatus, expectedStatus, code) => { mocks.request.mockRejectedValueOnce(new BackendApiError(backendStatus, "backend", "Refus backend")); const response = await detail(request(`/api/private/businesses/${businessId}/sales/${saleId}`), saleContext); expect(response.status).toBe(expectedStatus); expect((await response.json()).code).toBe(code); });
  it("renouvelle une seule fois sur 401 et transforme le réseau en 503", async () => { mocks.request.mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired")).mockResolvedValueOnce({ access: jwt(Math.floor(Date.now() / 1000) + 900), refresh: jwt(Math.floor(Date.now() / 1000) + 86_400) }).mockResolvedValueOnce({ public_id: saleId }); expect((await detail(request(`/api/private/businesses/${businessId}/sales/${saleId}`), saleContext)).status).toBe(200); expect(mocks.request).toHaveBeenCalledTimes(3); mocks.request.mockRejectedValueOnce(new BackendNetworkError()); expect((await lines(request(`/api/private/businesses/${businessId}/sales/${saleId}/lines`), saleContext)).status).toBe(503); });
});
