import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET as administrativeAreas } from "@/app/api/private/geography/administrative-areas/route";
import { GET as countries } from "@/app/api/private/geography/countries/route";
import { GET as localities } from "@/app/api/private/geography/localities/route";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontendUrl = "http://localhost:3001";

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

function request(path: string) {
  return new Request(`${frontendUrl}${path}`, { headers: { cookie: `ecommerce_session=${encryptSession(session())}` } });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontendUrl);
  vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000");
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web");
  vi.stubEnv("ECOMMERCE_HMAC_SECRET", "route-test-only-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "c".repeat(64));
  vi.stubEnv("NODE_ENV", "development");
});

describe("routes BFF du référentiel géographique", () => {
  it("renvoie les 249 pays sans les coder en dur dans le navigateur", async () => {
    const rows = Array.from({ length: 249 }, (_, index) => ({ id: index + 1, name: `Pays ${index + 1}`, iso2: "ZZ", phone_code: "" }));
    mocks.request.mockResolvedValueOnce(rows);

    const response = await countries(request("/api/private/geography/countries"));

    expect(response.status).toBe(200);
    expect((await response.json()).countries).toHaveLength(249);
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/countries/", expect.objectContaining({ accessToken: expect.any(String) }));
  });

  it("transmet les identifiants des listes dépendantes à Django", async () => {
    mocks.request.mockResolvedValueOnce([{ id: 2, name: "Kinshasa" }]);
    mocks.request.mockResolvedValueOnce([{ id: 3, name: "Gombe" }]);

    const areas = await administrativeAreas(request("/api/private/geography/administrative-areas?country_id=1"));
    const places = await localities(request("/api/private/geography/localities?administrative_area_id=2"));

    expect((await areas.json()).administrative_areas).toHaveLength(1);
    expect((await places.json()).localities).toHaveLength(1);
    expect(mocks.request).toHaveBeenNthCalledWith(1, "/api/v1/administrative-areas/", expect.objectContaining({ query: { country_id: "1" } }));
    expect(mocks.request).toHaveBeenNthCalledWith(2, "/api/v1/localities/", expect.objectContaining({ query: { administrative_area_id: "2" } }));
  });
});
