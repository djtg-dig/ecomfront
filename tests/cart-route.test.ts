import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { POST } from "@/app/api/private/carts/[...path]/route";
import { BackendApiError } from "@/lib/api/backend-client";
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontendUrl);
  vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000");
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web");
  vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64));
  vi.stubEnv("NODE_ENV", "development");
});

describe("BFF paniers", () => {
  it("propage le refus métier d’achat d’un membre actif", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(
      403,
      "BUSINESS_MEMBER_CANNOT_PURCHASE",
      "Vous ne pouvez pas acheter de produits dans une boutique dont vous êtes membre.",
    ));
    const request = new Request(`${frontendUrl}/api/private/carts/items`, {
      method: "POST",
      headers: {
        cookie: `ecommerce_session=${encryptSession(session())}`,
        origin: frontendUrl,
        "sec-fetch-site": "same-origin",
        "x-csrf-protection": "1",
        "content-type": "application/json",
      },
      body: JSON.stringify({ product: "PRP9QR35DPQH", quantity: "1" }),
    });

    const response = await POST(request, { params: Promise.resolve({ path: ["items"] }) });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "BUSINESS_MEMBER_CANNOT_PURCHASE",
      detail: "Vous ne pouvez pas acheter de produits dans une boutique dont vous êtes membre.",
    });
  });
});
