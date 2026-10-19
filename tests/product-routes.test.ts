import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET as categories } from "@/app/api/private/catalog/categories/route";
import { GET as attributes } from "@/app/api/private/catalog/categories/[code]/attributes/route";
import { GET as registry } from "@/app/api/private/catalog/registry/route";
import { GET as registryDetail } from "@/app/api/private/catalog/registry/[code]/route";
import { DELETE as remove, GET as detail, PATCH as update } from "@/app/api/private/businesses/[businessId]/products/[productId]/route";
import { GET as list, POST as create } from "@/app/api/private/businesses/[businessId]/products/route";
import { GET as listMedia, POST as uploadMedia } from "@/app/api/private/businesses/[businessId]/products/[productId]/media/route";
import { BackendApiError, BackendNetworkError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontend = "http://localhost:3001";
const businessId = "BUS123";
const productId = "PRD456";
const productContext = { params: Promise.resolve({ businessId, productId }) };
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

describe("routes BFF du catalogue", () => {
  it("relaie les filtres documentés, les catégories et les attributs sans exposer de JWT", async () => {
    mocks.request.mockResolvedValueOnce([{ public_id: productId, name: "Savon" }]);
    const products = await list(request(`/api/private/businesses/${businessId}/products?status=ACTIVE&category=HYGIENE&search=savon`), businessContext);
    expect(products.status).toBe(200);
    expect(await products.json()).toEqual({ products: [{ public_id: productId, name: "Savon" }] });
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/products/`, expect.objectContaining({ query: { status: "ACTIVE", category: "HYGIENE", search: "savon" }, accessToken: expect.any(String) }));

    mocks.request.mockResolvedValueOnce([{ code: "HYGIENE", name: "Hygiène" }]);
    expect((await categories(request("/api/private/catalog/categories"))).status).toBe(200);
    mocks.request.mockResolvedValueOnce([{ code: "weight", data_type: "DECIMAL" }]);
    expect((await attributes(request("/api/private/catalog/categories/HYGIENE/attributes"), { params: Promise.resolve({ code: "HYGIENE" }) })).status).toBe(200);

    const registryCategories = Array.from({ length: 32 }, (_, index) => ({ code: `category_${index}`, label: `Catégorie ${index}`, parent: "general" }));
    mocks.request.mockResolvedValueOnce(registryCategories);
    const registryResponse = await registry(request("/api/private/catalog/registry"));
    expect(registryResponse.status).toBe(200);
    expect((await registryResponse.json() as { categories: unknown[] }).categories).toHaveLength(32);
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/product-categories/registry/", expect.objectContaining({ accessToken: expect.any(String) }));

    mocks.request.mockResolvedValueOnce({ code: "televisions", attributes: [{ code: "screen_size", type: "decimal" }] });
    const definition = await registryDetail(request("/api/private/catalog/registry/televisions"), { params: Promise.resolve({ code: "televisions" }) });
    expect(definition.status).toBe(200);
    expect(await definition.json()).toEqual({ category: { code: "televisions", attributes: [{ code: "screen_size", type: "decimal" }] } });
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/product-categories/registry/televisions/", expect.objectContaining({ accessToken: expect.any(String) }));
  });

  it("crée et modifie seulement après la protection CSRF", async () => {
    const payload = { name: "Savon", category: "HYGIENE", selling_price: "1000", currency: "CDF", attributes: {} };
    mocks.request.mockResolvedValueOnce({ public_id: productId, ...payload });
    const created = await create(mutation(`/api/private/businesses/${businessId}/products`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }), businessContext);
    expect(created.status).toBe(201);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/products/`, expect.objectContaining({ method: "POST", json: payload }));

    mocks.request.mockResolvedValueOnce({ public_id: productId, ...payload, status: "INACTIVE" });
    expect((await update(mutation(`/api/private/businesses/${businessId}/products/${productId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "INACTIVE" }) }), productContext)).status).toBe(200);

    expect((await create(request(`/api/private/businesses/${businessId}/products`, { method: "POST", body: "{}" }), businessContext)).status).toBe(403);
  });

  it("transmet le multipart vidéo et sa boundary sans la reconstruire", async () => {
    const form = new FormData();
    form.set("media_type", "VIDEO");
    form.set("file", new File(["video-bytes"], "demo.mp4", { type: "video/mp4" }));
    mocks.request.mockResolvedValueOnce({ id: "11111111-1111-1111-1111-111111111111", media_type: "VIDEO", secure_url: "https://media.example/video.mp4" });
    const response = await uploadMedia(mutation(`/api/private/businesses/${businessId}/products/${productId}/media`, { method: "POST", body: form }), productContext);

    expect(response.status).toBe(201);
    const [, options] = mocks.request.mock.calls[0] as [string, { contentType: string; rawBody: ArrayBuffer; method: string }];
    expect(mocks.request.mock.calls[0][0]).toBe(`/api/v1/businesses/${businessId}/products/${productId}/media/`);
    expect(options.method).toBe("POST");
    expect(options.contentType).toMatch(/^multipart\/form-data;.*boundary=/);
    expect(new TextDecoder().decode(options.rawBody)).toContain('name="media_type"');
    expect(new TextDecoder().decode(options.rawBody)).toContain("VIDEO");
  });

  it("refuse un multipart sans boundary avant Django", async () => {
    const response = await uploadMedia(mutation(`/api/private/businesses/${businessId}/products/${productId}/media`, {
      method: "POST", headers: { "content-type": "multipart/form-data" }, body: "not-a-multipart-body",
    }), productContext);
    expect(response.status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("renvoie la galerie vidéo fournie par Django", async () => {
    mocks.request.mockResolvedValueOnce([{ id: "video-1", media_type: "VIDEO", secure_url: "https://media.example/video.mp4" }]);
    const response = await listMedia(request(`/api/private/businesses/${businessId}/products/${productId}/media`), productContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ media: [{ id: "video-1", media_type: "VIDEO", secure_url: "https://media.example/video.mp4" }] });
  });

  it("supprime par identifiant connu seulement après la protection CSRF", async () => {
    mocks.request.mockResolvedValueOnce(undefined);
    const response = await remove(mutation(`/api/private/businesses/${businessId}/products/${productId}`, { method: "DELETE" }), productContext);
    expect(response.status).toBe(204);
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/products/${productId}/`, expect.objectContaining({ method: "DELETE" }));

    expect((await remove(request(`/api/private/businesses/${businessId}/products/${productId}`, { method: "DELETE" }), productContext)).status).toBe(403);
  });

  it("refuse les identifiants et filtres hors contrat avant le backend", async () => {
    expect((await list(request(`/api/private/businesses/${businessId}/products?status=DRAFT`), businessContext)).status).toBe(400);
    expect((await attributes(request("/api/private/catalog/categories/../attributes"), { params: Promise.resolve({ code: "../" }) })).status).toBe(400);
    expect((await registryDetail(request("/api/private/catalog/registry/../"), { params: Promise.resolve({ code: "../" }) })).status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("retourne 401 sans session et ne divulgue aucune ressource multi-entreprise", async () => {
    const missing = await detail(new Request(`${frontend}/api/private/businesses/${businessId}/products/${productId}`), productContext);
    expect(missing.status).toBe(401);
    expect((await missing.json()).code).toBe("session_expired");
    expect(missing.headers.getSetCookie().join("\n")).toContain("Max-Age=0");

    mocks.request.mockRejectedValueOnce(new BackendApiError(404, "not_found", "Produit inconnu"));
    const otherBusiness = await detail(request(`/api/private/businesses/OTHER999/products/${productId}`), { params: Promise.resolve({ businessId: "OTHER999", productId }) });
    expect(otherBusiness.status).toBe(403);
    expect((await otherBusiness.json()).code).toBe("resource_not_allowed");
  });

  it.each([[400, 400, "invalid_request"], [403, 403, "access_forbidden"], [404, 403, "resource_not_allowed"], [409, 409, "conflict"]])("normalise l’erreur Django %i", async (backendStatus, expectedStatus, code) => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(backendStatus, "backend", "Refus backend"));
    const response = await detail(request(`/api/private/businesses/${businessId}/products/${productId}`), productContext);
    expect(response.status).toBe(expectedStatus);
    expect((await response.json()).code).toBe(code);
  });

  it("transmet les erreurs de validation produit sans les réduire à un message générique", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(
      400,
      null,
      "screen_size est obligatoire.",
      { attributes: ["screen_size est obligatoire."] },
    ));
    const response = await create(mutation(`/api/private/businesses/${businessId}/products`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category_code: "televisions", attributes: {} }),
    }), businessContext);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "invalid_request",
      detail: "screen_size est obligatoire.",
      errors: { attributes: ["screen_size est obligatoire."] },
    });
  });

  it("renouvelle une seule fois après un 401, puis signale une indisponibilité en 503", async () => {
    mocks.request
      .mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired"))
      .mockResolvedValueOnce({ access: jwt(Math.floor(Date.now() / 1000) + 900), refresh: jwt(Math.floor(Date.now() / 1000) + 86_400) })
      .mockResolvedValueOnce({ public_id: productId, name: "Savon" });
    expect((await detail(request(`/api/private/businesses/${businessId}/products/${productId}`), productContext)).status).toBe(200);
    expect(mocks.request).toHaveBeenCalledTimes(3);

    mocks.request.mockRejectedValueOnce(new BackendNetworkError());
    expect((await detail(request(`/api/private/businesses/${businessId}/products/${productId}`), productContext)).status).toBe(503);
  });
});
