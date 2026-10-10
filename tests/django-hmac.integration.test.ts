import { describe, expect, it } from "vitest";

import { BackendApiError, createBackendClient } from "@/lib/api/backend-client";

const runIntegration = process.env.RUN_DJANGO_HMAC_INTEGRATION === "true";
const backendUrl = process.env.DJANGO_BACKEND_URL;
const hmacSecret = process.env.ECOMMERCE_HMAC_SECRET;

describe.runIf(runIntegration && backendUrl && hmacSecret)("interopérabilité Django HMAC", () => {
  const path = "/api/v1/auth/carri/handoff/consume/";
  const client = createBackendClient({
    backendUrl: backendUrl!,
    hmacClientId: process.env.ECOMMERCE_HMAC_CLIENT_ID || "ecommerce-web",
    hmacSecret: hmacSecret!,
  });

  it("franchit HMAC avant le rejet métier du handoff invalide", async () => {
    await expect(client.request(path, { method: "POST", json: { handoff: "invalid-handoff-for-integration-test" } }))
      .rejects.toMatchObject<Partial<BackendApiError>>({ status: 400 });
  });

  it("rejette une requête directe non signée au middleware", async () => {
    const response = await fetch(`${backendUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handoff: "invalid-handoff-for-integration-test" }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "client_signature_required" });
  });
});
