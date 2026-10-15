import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { POST as action } from "@/app/api/invitation/[action]/route";
import { GET as continueInvitation } from "@/app/api/invitation/continue/route";
import { GET as context } from "@/app/api/invitation/context/route";
import { BackendApiError } from "@/lib/api/backend-client";
import { encryptProtectedPayload, encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontendUrl = "http://localhost:3001";
const invitationId = "MI23456789AB";
const token = "t".repeat(43);

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

function invitationCookie() {
  return encryptProtectedPayload({ invitationId, token });
}

function request(path: string, method = "GET") {
  return new Request(`${frontendUrl}${path}`, {
    method,
    headers: {
      cookie: `ecommerce_invitation_context=${invitationCookie()}; ecommerce_session=${encryptSession(session())}`,
      ...(method === "POST" ? { origin: frontendUrl, "sec-fetch-site": "same-origin", "x-csrf-protection": "1" } : {}),
    },
  });
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

describe("parcours BFF du lien d’invitation", () => {
  it("retire le jeton de l’URL et le place seulement dans un cookie chiffré", async () => {
    const response = await continueInvitation(new Request(`${frontendUrl}/api/invitation/continue?invitation=${invitationId}&token=${token}`));
    const location = new URL(response.headers.get("location") ?? "");
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("ecommerce_invitation_context=")) ?? "";

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/invitation");
    expect(location.search).toBe("");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain(token);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("représente l’absence de session comme un état public sans exposer le jeton", async () => {
    const response = await context(new Request(`${frontendUrl}/api/invitation/context`, {
      headers: { cookie: `ecommerce_invitation_context=${invitationCookie()}` },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.state).toBe("authentication_required");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("transmet le jeton au seul endpoint Django prévu et conserve les erreurs métier", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(410, "invitation_expired", "Cette invitation a expiré."));
    const response = await action(request("/api/invitation/accept", "POST"), { params: Promise.resolve({ action: "accept" }) });
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({ code: "invitation_expired", detail: "Cette invitation a expiré." });
    expect(mocks.request).toHaveBeenCalledWith(
      `/api/v1/me/business-invitations/${invitationId}/accept/`,
      expect.objectContaining({ method: "POST", json: { token }, accessToken: expect.any(String) }),
    );
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("bloque une action cross-site avant tout appel Django", async () => {
    const response = await action(new Request(`${frontendUrl}/api/invitation/accept`, {
      method: "POST",
      headers: { cookie: `ecommerce_invitation_context=${invitationCookie()}`, origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
    }), { params: Promise.resolve({ action: "accept" }) });

    expect(response.status).toBe(403);
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
