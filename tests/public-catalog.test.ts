import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", () => ({
  BackendApiError: class BackendApiError extends Error {
    constructor(readonly status: number) { super("backend"); }
  },
  BackendNetworkError: class BackendNetworkError extends Error {},
  backendClient: { request: mocks.request },
}));

import { loadPublicCatalogPage } from "@/lib/api/public-catalog";

describe("chargement serveur du catalogue public", () => {
  beforeEach(() => vi.clearAllMocks());

  it("conserve le contrat paginé direct de la recherche", async () => {
    mocks.request.mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{ public_id: "PR1234567890" }] });

    await expect(loadPublicCatalogPage("products/search", { q: "savon", page: "1" })).resolves.toEqual({
      data: { count: 1, next: null, previous: null, results: [{ public_id: "PR1234567890" }] },
      error: null,
    });
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/public/products/search/", { query: { q: "savon", page: "1" } });
  });

  it("normalise le contrat paginé des catégories et boutiques", async () => {
    mocks.request.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: { category: { slug: "hygiene" }, products: [{ public_id: "PR1234567890" }] },
    });

    await expect(loadPublicCatalogPage("categories/hygiene", { page: "1" })).resolves.toEqual({
      data: { count: 1, next: null, previous: null, results: [{ public_id: "PR1234567890" }] },
      error: null,
    });
  });
});
