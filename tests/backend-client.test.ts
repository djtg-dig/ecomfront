import { describe, expect, it, vi } from "vitest";

import {
  BackendApiError,
  BackendNetworkError,
  createBackendClient,
} from "@/lib/api/backend-client";

const config = {
  backendUrl: "https://django.test",
  hmacClientId: "ecommerce-web",
  hmacSecret: "test-secret",
};

describe("client HTTP BFF", () => {
  it("signe une requête JSON, garde les queries répétées et n'envoie pas les cookies", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }),
    );
    const client = createBackendClient(config, fetchMock);

    await expect(client.request<{ ok: boolean }>("/api/v1/resource/", {
      method: "POST",
      query: { tag: ["b", "a"], empty: null },
      json: { label: "été" },
      accessToken: "access-token",
    })).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://django.test/api/v1/resource/?tag=b&tag=a&empty=");
    expect(init?.body).toBe('{"label":"été"}');
    expect(init?.credentials).toBe("omit");
    expect(init?.cache).toBe("no-store");
    expect(new Headers(init?.headers).get("X-Ecommerce-Signature")).toMatch(/^[a-f0-9]{64}$/);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("traite une réponse sans corps", async () => {
    const client = createBackendClient(config, vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(client.request("/api/v1/resource/", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("préserve le code et le détail Django sans exposer d'erreur interne", async () => {
    const client = createBackendClient(config, vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: "client_signature_required", detail: "Signature obligatoire." }), { status: 401, headers: { "content-type": "application/json" } }),
    ));
    await expect(client.request("/api/v1/resource/")).rejects.toMatchObject<Partial<BackendApiError>>({
      status: 401,
      code: "client_signature_required",
      detail: "Signature obligatoire.",
    });
  });

  it("préserve les erreurs de validation Django destinées aux champs", async () => {
    const client = createBackendClient(config, vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ category_code: ["Catégorie inconnue."], attributes: ["screen_size est obligatoire."] }), { status: 400, headers: { "content-type": "application/json" } }),
    ));
    await expect(client.request("/api/v1/resource/")).rejects.toMatchObject<Partial<BackendApiError>>({
      status: 400,
      detail: "Catégorie inconnue.",
      fieldErrors: {
        category_code: ["Catégorie inconnue."],
        attributes: ["screen_size est obligatoire."],
      },
    });
  });

  it("convertit les erreurs réseau et refuse une cible hors API", async () => {
    const client = createBackendClient(config, vi.fn<typeof fetch>().mockRejectedValue(new Error("socket details")));
    await expect(client.request("/api/v1/resource/")).rejects.toBeInstanceOf(BackendNetworkError);
    await expect(client.request("https://other.example/")).rejects.toThrow("/api/v1/");
  });
});
