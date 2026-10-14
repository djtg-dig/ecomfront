import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET as customers } from "@/app/api/private/businesses/[businessId]/customers/route";
import { GET as customer, PATCH as updateCustomer } from "@/app/api/private/businesses/[businessId]/customers/[customerId]/route";
import { GET as customerProfile } from "@/app/api/private/businesses/[businessId]/customers/[customerId]/profile/route";
import { GET as suppliers } from "@/app/api/private/businesses/[businessId]/suppliers/route";
import { GET as supplierProfile } from "@/app/api/private/businesses/[businessId]/suppliers/[supplierId]/profile/route";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontend = "http://localhost:3001"; const businessId = "BUS123";
const businessContext = { params: Promise.resolve({ businessId }) };
const customerContext = { params: Promise.resolve({ businessId, customerId: "CU1" }) };
function jwt(exp: number) { return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`; }
function session(): EcommerceSession { return { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400), accessExpiresAt: Date.now() + 900_000, refreshExpiresAt: Date.now() + 86_400_000 }; }
function request(path: string, init: RequestInit = {}) { return new Request(`${frontend}${path}`, { ...init, headers: { cookie: `ecommerce_session=${encryptSession(session())}`, ...init.headers } }); }
function mutation(path: string, init: RequestInit = {}) { return request(path, { ...init, headers: { origin: frontend, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", ...init.headers } }); }

beforeEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontend); vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000"); vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web"); vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret"); vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("NODE_ENV", "development"); });

describe("routes BFF partenaires commerciaux", () => {
  it("relaie recherche, tri et pagination sans exposer la session", async () => {
    mocks.request.mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{ public_id: "CU1" }] });
    const customersResponse = await customers(request(`/api/private/businesses/${businessId}/customers?q=Ada&ordering=-created_at&page=2`), businessContext);
    expect(customersResponse.status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/customers/`, expect.objectContaining({ query: { q: "Ada", ordering: "-created_at", page: "2", page_size: undefined } }));
    mocks.request.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    expect((await suppliers(request(`/api/private/businesses/${businessId}/suppliers?page=1`), businessContext)).status).toBe(200);
  });

  it("relaie les fiches, historiques et modifications protégées par CSRF", async () => {
    mocks.request.mockResolvedValueOnce({ public_id: "CU1", name: "Ada" });
    expect((await customer(request(`/api/private/businesses/${businessId}/customers/CU1`), customerContext)).status).toBe(200);
    mocks.request.mockResolvedValueOnce({ customer: { public_id: "CU1" }, sales: { count: 0, results: [] } });
    expect((await customerProfile(request(`/api/private/businesses/${businessId}/customers/CU1/profile?page=1`), customerContext)).status).toBe(200);
    mocks.request.mockResolvedValueOnce({ supplier: { public_id: "SP1" }, purchases: { count: 0, results: [] } });
    expect((await supplierProfile(request(`/api/private/businesses/${businessId}/suppliers/SP1/profile`), { params: Promise.resolve({ businessId, supplierId: "SP1" }) })).status).toBe(200);
    mocks.request.mockResolvedValueOnce({ public_id: "CU1", name: "Ada corrigée" });
    expect((await updateCustomer(mutation(`/api/private/businesses/${businessId}/customers/CU1`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Ada corrigée" }) }), customerContext)).status).toBe(200);
  });

  it("rejette les filtres, identifiants et mutations hors contrat", async () => {
    expect((await customers(request(`/api/private/businesses/${businessId}/customers?page=nope`), businessContext)).status).toBe(400);
    expect((await updateCustomer(request(`/api/private/businesses/${businessId}/customers/CU1`, { method: "PATCH" }), customerContext)).status).toBe(403);
    expect((await customer(request(`/api/private/businesses/${businessId}/customers/x`), { params: Promise.resolve({ businessId, customerId: "../" }) })).status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
