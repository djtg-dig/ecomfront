import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET as detail } from "@/app/api/private/businesses/[businessId]/inventory/[inventoryId]/route";
import { GET as movements, POST as createMovement } from "@/app/api/private/businesses/[businessId]/inventory/[inventoryId]/movements/route";
import { GET as list, POST as createInventory } from "@/app/api/private/businesses/[businessId]/inventory/route";
import { GET as summary } from "@/app/api/private/businesses/[businessId]/inventory/summary/route";
import { GET as history } from "@/app/api/private/businesses/[businessId]/inventory/movements/route";
import { BackendApiError, BackendNetworkError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontend = "http://localhost:3001";
const businessId = "BUS123";
const inventoryId = "IV456";
const inventoryContext = { params: Promise.resolve({ businessId, inventoryId }) };
const businessContext = { params: Promise.resolve({ businessId }) };
function jwt(exp: number) { return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`; }
function session(): EcommerceSession { return { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400), accessExpiresAt: Date.now() + 900_000, refreshExpiresAt: Date.now() + 86_400_000 }; }
function request(path: string, init: RequestInit = {}) { return new Request(`${frontend}${path}`, { ...init, headers: { cookie: `ecommerce_session=${encryptSession(session())}`, ...init.headers } }); }
function mutation(path: string, init: RequestInit = {}) { return request(path, { ...init, headers: { origin: frontend, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", ...init.headers } }); }

beforeEach(() => {
  vi.unstubAllEnvs(); vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontend); vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000");
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web"); vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("NODE_ENV", "development");
});

describe("routes BFF inventaire", () => {
  it("relaie les filtres autorisés, le détail et l’historique sous le bon tenant", async () => {
    mocks.request.mockResolvedValueOnce({ count: 148, next: "next", previous: null, results: [{ public_id: inventoryId, available_quantity: "3.000" }] });
    const listResponse = await list(request(`/api/private/businesses/${businessId}/inventory?product=PR123&low_stock=true&page=2`), businessContext);
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual(expect.objectContaining({ inventory: [expect.objectContaining({ public_id: inventoryId })], pagination: { count: 148, next: "next", previous: null } }));
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/inventory/`, expect.objectContaining({ query: { product: "PR123", variant: undefined, low_stock: "true", q: undefined, status: undefined, ordering: undefined, page: "2" }, accessToken: expect.any(String) }));
    mocks.request.mockResolvedValueOnce({ public_id: inventoryId });
    expect((await detail(request(`/api/private/businesses/${businessId}/inventory/${inventoryId}`), inventoryContext)).status).toBe(200);
    mocks.request.mockResolvedValueOnce([]);
    expect((await movements(request(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`), inventoryContext)).status).toBe(200);
  });

  it("protège chaque mutation CSRF et ne fait aucun calcul de quantité BFF", async () => {
    const item = { product: "PR123", low_stock_threshold: "2.000" };
    mocks.request.mockResolvedValueOnce({ public_id: inventoryId, ...item });
    expect((await createInventory(mutation(`/api/private/businesses/${businessId}/inventory`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) }), businessContext)).status).toBe(201);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/inventory/`, expect.objectContaining({ method: "POST", json: item }));
    const movement = { type: "ADJUSTMENT", target_quantity: "0.000", reason: "Comptage" };
    mocks.request.mockResolvedValueOnce({ public_id: "SM1", quantity_after: "0.000" });
    expect((await createMovement(mutation(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "movement-key" }, body: JSON.stringify(movement) }), inventoryContext)).status).toBe(201);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/inventory/${inventoryId}/movements/`, expect.objectContaining({ method: "POST", json: movement, headers: { "Idempotency-Key": "movement-key" } }));
    expect((await createMovement(request(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`, { method: "POST", body: "{}" }), inventoryContext)).status).toBe(403);
  });

  it("relaie le résumé et l’historique global avec des filtres validés", async () => {
    mocks.request.mockResolvedValueOnce({ tracked_products: 2, recent_movements: [] });
    expect((await summary(request(`/api/private/businesses/${businessId}/inventory/summary`), businessContext)).status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/inventory/summary/`, expect.objectContaining({ accessToken: expect.any(String) }));
    mocks.request.mockResolvedValueOnce({ count: 1, results: [] });
    expect((await history(request(`/api/private/businesses/${businessId}/inventory/movements?type=SALE&origin=SALE&date_from=2026-01-01&page=3`), businessContext)).status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/inventory/movements/`, expect.objectContaining({ query: expect.objectContaining({ type: "SALE", origin: "SALE", date_from: "2026-01-01", page: "3" }) }));
  });

  it("exige une clé d’idempotence pour un mouvement", async () => {
    const response = await createMovement(mutation(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`, { method: "POST", body: "{}" }), inventoryContext);
    expect(response.status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("rejette les filtres et identifiants hors contrat avant Django", async () => {
    expect((await list(request(`/api/private/businesses/${businessId}/inventory?low_stock=false`), businessContext)).status).toBe(400);
    expect((await history(request(`/api/private/businesses/${businessId}/inventory/movements?page=0`), businessContext)).status).toBe(400);
    expect((await detail(request("/api/private/businesses/x/inventory/y"), { params: Promise.resolve({ businessId: "../", inventoryId: "y" }) })).status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("protège une ressource d’une autre entreprise et une session absente", async () => {
    const absent = await detail(new Request(`${frontend}/api/private/businesses/${businessId}/inventory/${inventoryId}`), inventoryContext);
    expect(absent.status).toBe(401);
    expect(absent.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
    mocks.request.mockRejectedValueOnce(new BackendApiError(404, "not_found", "Inconnu"));
    const crossTenant = await detail(request(`/api/private/businesses/OTHER999/inventory/${inventoryId}`), { params: Promise.resolve({ businessId: "OTHER999", inventoryId }) });
    expect(crossTenant.status).toBe(403);
    expect((await crossTenant.json()).code).toBe("resource_not_allowed");
  });

  it.each([[400, 400, "invalid_request"], [403, 403, "access_forbidden"], [404, 403, "resource_not_allowed"], [409, 409, "conflict"]])("normalise l’erreur Django %i", async (backendStatus, expectedStatus, code) => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(backendStatus, "backend", "Refus backend"));
    const response = await detail(request(`/api/private/businesses/${businessId}/inventory/${inventoryId}`), inventoryContext);
    expect(response.status).toBe(expectedStatus);
    expect((await response.json()).code).toBe(code);
  });

  it("renouvelle une seule fois sur 401 et traduit une indisponibilité en 503", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired")).mockResolvedValueOnce({ access: jwt(Math.floor(Date.now() / 1000) + 900), refresh: jwt(Math.floor(Date.now() / 1000) + 86_400) }).mockResolvedValueOnce({ public_id: inventoryId });
    expect((await detail(request(`/api/private/businesses/${businessId}/inventory/${inventoryId}`), inventoryContext)).status).toBe(200);
    expect(mocks.request).toHaveBeenCalledTimes(3);
    mocks.request.mockRejectedValueOnce(new BackendNetworkError());
    expect((await detail(request(`/api/private/businesses/${businessId}/inventory/${inventoryId}`), inventoryContext)).status).toBe(503);
  });
});
