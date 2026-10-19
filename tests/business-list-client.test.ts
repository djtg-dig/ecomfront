import { afterEach, describe, expect, it, vi } from "vitest";

import { BusinessListRequestError, fetchBusinesses } from "@/lib/businesses/list-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchBusinesses", () => {
  it("partage une requête en cours entre plusieurs consommateurs", async () => {
    let resolveResponse: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchBusinesses();
    const second = fetchBusinesses();

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveResponse!(Response.json({ businesses: [{ public_id: "BUS1", name: "Boutique", primary_currency: "CDF", status: "ACTIVE" }] }));
    await expect(first).resolves.toHaveLength(1);
  });

  it("effectue une nouvelle requête contrôlée après un échec", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ detail: "Délai dépassé" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ businesses: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBusinesses()).rejects.toEqual(expect.objectContaining<Partial<BusinessListRequestError>>({ status: 503, message: "Délai dépassé" }));
    await expect(fetchBusinesses()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
