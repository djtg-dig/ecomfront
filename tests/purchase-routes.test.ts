import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { POST as action } from "@/app/api/private/businesses/[businessId]/purchases/[purchaseId]/[action]/route";
import { GET as lines, POST as createLine } from "@/app/api/private/businesses/[businessId]/purchases/[purchaseId]/lines/route";
import { GET as detail } from "@/app/api/private/businesses/[businessId]/purchases/[purchaseId]/route";
import { GET as purchases, POST as createPurchase } from "@/app/api/private/businesses/[businessId]/purchases/route";
import { PATCH as updateSupplier } from "@/app/api/private/businesses/[businessId]/suppliers/[supplierId]/route";
import { GET as suppliers, POST as createSupplier } from "@/app/api/private/businesses/[businessId]/suppliers/route";
import { BackendApiError, BackendNetworkError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontend = "http://localhost:3001";
const businessId = "BUS123";
const purchaseId = "PU456";
const purchaseContext = { params: Promise.resolve({ businessId, purchaseId }) };
const businessContext = { params: Promise.resolve({ businessId }) };
function jwt(exp: number) { return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`; }
function session(): EcommerceSession { return { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400), accessExpiresAt: Date.now() + 900_000, refreshExpiresAt: Date.now() + 86_400_000 }; }
function request(path: string, init: RequestInit = {}) { return new Request(`${frontend}${path}`, { ...init, headers: { cookie: `ecommerce_session=${encryptSession(session())}`, ...init.headers } }); }
function mutation(path: string, init: RequestInit = {}) { return request(path, { ...init, headers: { origin: frontend, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", ...init.headers } }); }

beforeEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontend); vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000"); vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web"); vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret"); vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("NODE_ENV", "development"); });

describe("routes BFF achats", () => {
  it("relaie fournisseurs, achats, lignes et transitions dans le périmètre entreprise", async () => {
    mocks.request.mockResolvedValueOnce([{ public_id: "SP1", name: "Fournisseur" }]);
    expect((await suppliers(request(`/api/private/businesses/${businessId}/suppliers`), businessContext)).status).toBe(200);
    mocks.request.mockResolvedValueOnce({ public_id: "SP1", name: "Fournisseur" });
    expect((await createSupplier(mutation(`/api/private/businesses/${businessId}/suppliers`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Fournisseur" }) }), businessContext)).status).toBe(201);
    mocks.request.mockResolvedValueOnce({ public_id: "SP1", name: "Fournisseur corrigé" });
    expect((await updateSupplier(mutation(`/api/private/businesses/${businessId}/suppliers/SP1`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Fournisseur corrigé" }) }), { params: Promise.resolve({ businessId, supplierId: "SP1" }) })).status).toBe(200);
    mocks.request.mockResolvedValueOnce({ public_id: purchaseId, status: "DRAFT" });
    expect((await createPurchase(mutation(`/api/private/businesses/${businessId}/purchases`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplier: "SP1", reference: "BC-1" }) }), businessContext)).status).toBe(201);
    mocks.request.mockResolvedValueOnce({ public_id: "PL1", product: "PR1" });
    expect((await createLine(mutation(`/api/private/businesses/${businessId}/purchases/${purchaseId}/lines`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: "PR1", quantity: "2", unit_cost: "5" }) }), purchaseContext)).status).toBe(201);
    mocks.request.mockResolvedValueOnce({ public_id: purchaseId, status: "CONFIRMED" });
    expect((await action(mutation(`/api/private/businesses/${businessId}/purchases/${purchaseId}/confirm`, { method: "POST" }), { params: Promise.resolve({ businessId, purchaseId, action: "confirm" }) })).status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/purchases/${purchaseId}/confirm/`, expect.objectContaining({ method: "POST", json: {} }));
  });

  it("bloque CSRF et les identifiants référencés invalides avant Django", async () => {
    expect((await createPurchase(mutation(`/api/private/businesses/${businessId}/purchases`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplier: "../" }) }), businessContext)).status).toBe(400);
    expect((await createLine(mutation(`/api/private/businesses/${businessId}/purchases/${purchaseId}/lines`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: "PR1", variant: "PV1" }) }), purchaseContext)).status).toBe(400);
    expect((await action(request(`/api/private/businesses/${businessId}/purchases/${purchaseId}/receive`, { method: "POST" }), { params: Promise.resolve({ businessId, purchaseId, action: "receive" }) })).status).toBe(403);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("protège la session absente et les achats hors entreprise", async () => {
    const absent = await detail(new Request(`${frontend}/api/private/businesses/${businessId}/purchases/${purchaseId}`), purchaseContext);
    expect(absent.status).toBe(401);
    expect(absent.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
    mocks.request.mockRejectedValueOnce(new BackendApiError(404, "not_found", "Achat inconnu"));
    const foreign = await detail(request(`/api/private/businesses/OTHER999/purchases/${purchaseId}`), { params: Promise.resolve({ businessId: "OTHER999", purchaseId }) });
    expect(foreign.status).toBe(403);
    expect((await foreign.json()).code).toBe("resource_not_allowed");
  });

  it.each([[400, 400, "invalid_request"], [403, 403, "access_forbidden"], [404, 403, "resource_not_allowed"], [409, 409, "conflict"]])("normalise l’erreur Django %i", async (backendStatus, expectedStatus, code) => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(backendStatus, "backend", "Refus backend"));
    const response = await detail(request(`/api/private/businesses/${businessId}/purchases/${purchaseId}`), purchaseContext);
    expect(response.status).toBe(expectedStatus); expect((await response.json()).code).toBe(code);
  });

  it("renouvelle une fois sur 401 et retourne 503 à l’indisponibilité", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired")).mockResolvedValueOnce({ access: jwt(Math.floor(Date.now() / 1000) + 900), refresh: jwt(Math.floor(Date.now() / 1000) + 86_400) }).mockResolvedValueOnce({ public_id: purchaseId });
    expect((await detail(request(`/api/private/businesses/${businessId}/purchases/${purchaseId}`), purchaseContext)).status).toBe(200);
    expect(mocks.request).toHaveBeenCalledTimes(3);
    mocks.request.mockRejectedValueOnce(new BackendNetworkError());
    expect((await lines(request(`/api/private/businesses/${businessId}/purchases/${purchaseId}/lines`), purchaseContext)).status).toBe(503);
  });
});
