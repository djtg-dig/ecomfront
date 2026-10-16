import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET } from "@/app/api/private/invitations/route";
import { POST } from "@/app/api/private/invitations/[invitationId]/[action]/route";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontendUrl = "http://localhost:3001";
const invitationId = "MI23456789AB";

function jwt(expiresAt: number) { return `header.${Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url")}.signature`; }
function session(): EcommerceSession { return { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400), accessExpiresAt: Date.now() + 900_000, refreshExpiresAt: Date.now() + 86_400_000 }; }
function request(path: string, mutation = false) { return new Request(`${frontendUrl}${path}`, { method: mutation ? "POST" : "GET", headers: { cookie: `ecommerce_session=${encryptSession(session())}`, ...(mutation ? { origin: frontendUrl, "sec-fetch-site": "same-origin", "x-csrf-protection": "1" } : {}) } }); }

beforeEach(() => {
  vi.unstubAllEnvs(); vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontendUrl);
  vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000");
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web");
  vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64));
  vi.stubEnv("NODE_ENV", "development");
});

describe("routes BFF des invitations reçues", () => {
  it("liste les invitations sans exposer la session", async () => {
    mocks.request.mockResolvedValueOnce([{ public_id: invitationId, permissions: ["PRODUCT_VIEW"] }]);
    const response = await GET(request("/api/private/invitations"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ invitations: [{ public_id: invitationId, permissions: ["PRODUCT_VIEW"] }] });
    expect(JSON.stringify(body)).not.toMatch(/accessToken|refreshToken|signature/);
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/me/business-invitations/", expect.objectContaining({ accessToken: expect.any(String) }));
  });

  it.each(["accept", "decline"])("traite l’action authentifiée %s", async (action) => {
    mocks.request.mockResolvedValueOnce({ public_id: invitationId, status: action === "accept" ? "ACCEPTED" : "DECLINED" });
    const response = await POST(request(`/api/private/invitations/${invitationId}/${action}`, true), { params: Promise.resolve({ invitationId, action }) });
    expect(response.status).toBe(200);
    expect((await response.clone().json()).redirect_to).toBe(`/espace/entreprises?invitation=${action === "accept" ? "accepted" : "declined"}`);
    expect(mocks.request).toHaveBeenCalledWith(
      `/api/v1/me/business-invitations/${invitationId}/${action}-authenticated/`,
      expect.objectContaining({ method: "POST", json: {}, accessToken: expect.any(String) }),
    );
  });

  it("conserve un conflit métier et récupère le statut terminal", async () => {
    const { BackendApiError } = await import("@/lib/api/backend-client");
    mocks.request
      .mockRejectedValueOnce(new BackendApiError(409, "invitation_already_processed", "Cette invitation a déjà été traitée."))
      .mockResolvedValueOnce([{ public_id: invitationId, status: "DECLINED" }]);

    const response = await POST(request(`/api/private/invitations/${invitationId}/accept`, true), { params: Promise.resolve({ invitationId, action: "accept" }) });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "invitation_already_processed", detail: "Cette invitation a déjà été traitée.", invitation: { public_id: invitationId, status: "DECLINED" } });
  });

  it("bloque les mutations cross-site et les actions inconnues", async () => {
    const crossSite = new Request(`${frontendUrl}/api/private/invitations/${invitationId}/accept`, { method: "POST", headers: { cookie: `ecommerce_session=${encryptSession(session())}`, origin: "https://attacker.example", "sec-fetch-site": "cross-site" } });
    expect((await POST(crossSite, { params: Promise.resolve({ invitationId, action: "accept" }) })).status).toBe(403);
    expect((await POST(request(`/api/private/invitations/${invitationId}/remove`, true), { params: Promise.resolve({ invitationId, action: "remove" }) })).status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
