import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET as overview } from "@/app/api/private/overview/route";
import { POST as selectBusiness } from "@/app/api/private/business-selection/route";
import { GET as businesses, POST as createBusiness } from "@/app/api/private/businesses/route";
import { PATCH as updateBusiness } from "@/app/api/private/businesses/[businessId]/route";
import { BackendApiError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontendUrl = "http://localhost:3001";
const backendUrl = "http://localhost:8000";

function jwt(expiresAt: number) {
  return `header.${Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url")}.signature`;
}

function session(): EcommerceSession {
  return {
    accessToken: jwt(Math.floor(Date.now() / 1000) + 900),
    refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400),
    accessExpiresAt: Date.now() + 900_000,
    refreshExpiresAt: Date.now() + 86_400_000,
  };
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`${frontendUrl}${path}`, {
    ...init,
    headers: {
      cookie: `ecommerce_session=${encryptSession(session())}`,
      ...init.headers,
    },
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontendUrl);
  vi.stubEnv("DJANGO_BACKEND_URL", backendUrl);
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web");
  vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64));
  vi.stubEnv("NODE_ENV", "development");
});

describe("routes BFF de l’espace privé", () => {
  it("liste, crée et modifie via les seuls endpoints entreprises autorisés", async () => {
    mocks.request.mockResolvedValueOnce([]);
    const listed = await businesses(request("/api/private/businesses"));
    expect(listed.status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/businesses/", expect.objectContaining({ accessToken: expect.any(String) }));

    mocks.request.mockResolvedValueOnce({ public_id: "BUS123", name: "Boutique", primary_currency: "CDF" });
    const created = await createBusiness(request("/api/private/businesses", { method: "POST", headers: { origin: frontendUrl, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", "content-type": "application/json" }, body: JSON.stringify({ name: "Boutique", primary_currency: "CDF" }) }));
    expect(created.status).toBe(201);
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/businesses/", expect.objectContaining({ method: "POST", json: { name: "Boutique", primary_currency: "CDF" } }));

    mocks.request.mockResolvedValueOnce({ public_id: "BUS123", name: "Nouveau nom" });
    const updated = await updateBusiness(request("/api/private/businesses/BUS123", { method: "PATCH", headers: { origin: frontendUrl, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", "content-type": "application/json" }, body: JSON.stringify({ name: "Nouveau nom" }) }), { params: Promise.resolve({ businessId: "BUS123" }) });
    expect(updated.status).toBe(200);
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/businesses/BUS123/", expect.objectContaining({ method: "PATCH", json: { name: "Nouveau nom" } }));
  });

  it("ne tente pas une création cross-site", async () => {
    const response = await createBusiness(request("/api/private/businesses", { method: "POST", headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site", "x-csrf-protection": "1" }, body: "{}" }));
    expect(response.status).toBe(403);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("retourne seulement l’identité et les entreprises autorisées, sans exposer les JWT", async () => {
    mocks.request
      .mockResolvedValueOnce({ id: "identity-1", carri_subject: "carri-subject" })
      .mockResolvedValueOnce([{ public_id: "BUS123", name: "Boutique", status: "ACTIVE", primary_currency: "CDF" }]);

    const response = await overview(request("/api/private/overview"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      identity: { id: "identity-1", carri_subject: "carri-subject" },
      businesses: [{ public_id: "BUS123", name: "Boutique", status: "ACTIVE", primary_currency: "CDF" }],
      selectedBusinessId: null,
    });
    expect(JSON.stringify(body)).not.toContain("accessToken");
    expect(mocks.request).toHaveBeenNthCalledWith(1, "/api/v1/auth/me/", expect.objectContaining({ accessToken: expect.any(String) }));
    expect(mocks.request).toHaveBeenNthCalledWith(2, "/api/v1/businesses/", expect.objectContaining({ accessToken: expect.any(String) }));
  });

  it("renouvelle une seule fois puis rejoue l’appel ayant reçu 401", async () => {
    mocks.request
      .mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired"))
      .mockResolvedValueOnce({ access: jwt(Math.floor(Date.now() / 1000) + 900), refresh: jwt(Math.floor(Date.now() / 1000) + 86_400) })
      .mockResolvedValueOnce({ id: "identity-1", carri_subject: "carri-subject" })
      .mockResolvedValueOnce([]);

    const response = await overview(request("/api/private/overview"));

    expect(response.status).toBe(200);
    expect(mocks.request).toHaveBeenCalledTimes(4);
    expect(response.headers.getSetCookie().join("\n")).toContain("ecommerce_session=");
  });

  it("demande une reconnexion si le refresh est définitivement refusé", async () => {
    mocks.request
      .mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired"))
      .mockRejectedValueOnce(new BackendApiError(401, "token_not_valid", "Refresh invalid"));

    const response = await overview(request("/api/private/overview"));

    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("session_expired");
    expect(response.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });

  it("signale une indisponibilité lorsque le refresh échoue côté serveur", async () => {
    mocks.request
      .mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired"))
      .mockRejectedValueOnce(new BackendApiError(500, "server_error", "Refresh failed"));

    const response = await overview(request("/api/private/overview"));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("backend_unavailable");
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });

  it("renvoie 401 et efface la session quand elle est absente", async () => {
    const response = await overview(new Request(`${frontendUrl}/api/private/overview`));

    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("session_expired");
    expect(response.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
  });

  it("préserve une erreur 403 explicite du backend", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(403, "forbidden", "Accès refusé."));

    const response = await overview(request("/api/private/overview"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "access_forbidden", detail: "Vous n’êtes pas autorisé à accéder à cette ressource." });
  });

  it("signale l’indisponibilité du backend sans transformer l’erreur en session expirée", async () => {
    mocks.request.mockRejectedValueOnce(new Error("network unavailable"));

    const response = await overview(request("/api/private/overview"));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("backend_unavailable");
  });

  it("valide la sélection auprès du backend avant de mémoriser la préférence", async () => {
    mocks.request.mockResolvedValueOnce({ public_id: "BUS123", name: "Boutique", status: "ACTIVE", primary_currency: "CDF" });
    const response = await selectBusiness(request("/api/private/business-selection", {
      method: "POST",
      headers: { origin: frontendUrl, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", "content-type": "application/json" },
      body: JSON.stringify({ businessId: "BUS123" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/businesses/BUS123/", expect.objectContaining({ accessToken: expect.any(String) }));
    const cookies = response.headers.getSetCookie().join("\n");
    expect(cookies).toContain("ecommerce_selected_business=BUS123");
    expect(cookies).toContain("HttpOnly");
  });

  it("conserve uniquement une préférence présente dans les entreprises retournées après rechargement", async () => {
    mocks.request
      .mockResolvedValueOnce({ id: "identity-1", carri_subject: "carri-subject" })
      .mockResolvedValueOnce([{ public_id: "BUS123", name: "Boutique", status: "ACTIVE", primary_currency: "CDF" }]);
    const response = await overview(new Request(`${frontendUrl}/api/private/overview`, {
      headers: { cookie: `ecommerce_session=${encryptSession(session())}; ecommerce_selected_business=BUS123` },
    }));

    expect((await response.json()).selectedBusinessId).toBe("BUS123");
  });

  it("ne mémorise jamais une entreprise hors périmètre", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(404, "business_not_found", "Introuvable."));
    const response = await selectBusiness(request("/api/private/business-selection", {
      method: "POST",
      headers: { origin: frontendUrl, "sec-fetch-site": "same-origin", "x-csrf-protection": "1", "content-type": "application/json" },
      body: JSON.stringify({ businessId: "OTHER999" }),
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("business_not_allowed");
    expect(response.headers.getSetCookie().join("\n")).not.toContain("ecommerce_selected_business=");
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/businesses/OTHER999/", expect.objectContaining({ accessToken: expect.any(String) }));
  });

  it("refuse la sélection cross-site avant tout appel backend", async () => {
    const response = await selectBusiness(request("/api/private/business-selection", {
      method: "POST",
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site", "x-csrf-protection": "1", "content-type": "application/json" },
      body: JSON.stringify({ businessId: "BUS123" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
