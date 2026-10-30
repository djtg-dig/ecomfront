import "server-only";

import { BackendApiError, BackendNetworkError, backendClient } from "@/lib/api/backend-client";

export type PublicProduct = {
  public_id: string;
  name: string;
  description: string;
  business: string;
  business_name: string;
  category: string | null;
  category_name: string | null;
  selling_price: string;
  min_price: string;
  max_price: string;
  currency: string;
  is_negotiable: boolean;
  is_online_purchasable: boolean;
  is_home_deliverable: boolean;
  unit_code: string;
  unit: string;
  allows_decimal_quantity: boolean;
  image: string | null;
};

export type PublicCatalogPage = {
  count: number;
  next: string | number | null;
  previous?: string | number | null;
  results: PublicProduct[];
};

export type PublicCatalogResult<T> =
  | { data: T; error: null }
  | { data: null; error: "not_found" | "unavailable" };

type PublicCatalogEnvelope = Omit<PublicCatalogPage, "results"> & {
  results: PublicProduct[] | { products?: PublicProduct[] };
};

/** Charge un contrat catalogue strictement public depuis le Server Component. */
export async function loadPublicCatalog<T>(path: string, query?: Record<string, string | number | undefined>): Promise<PublicCatalogResult<T>> {
  try {
    const data = await backendClient.request<T>(`/api/v1/public/${path}/`, { query });
    return { data: data as T, error: null };
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return { data: null, error: "not_found" };
    }
    if (error instanceof BackendApiError || error instanceof BackendNetworkError) {
      return { data: null, error: "unavailable" };
    }
    return { data: null, error: "unavailable" };
  }
}

/** Normalise les deux contrats publics paginés sans modifier Django. */
export async function loadPublicCatalogPage(path: string, query?: Record<string, string | number | undefined>): Promise<PublicCatalogResult<PublicCatalogPage>> {
  const result = await loadPublicCatalog<PublicCatalogEnvelope>(path, query);
  if (!result.data) return result;
  const results = Array.isArray(result.data.results) ? result.data.results : result.data.results.products;
  if (!Array.isArray(results)) return { data: null, error: "unavailable" };
  return {
    data: {
      count: result.data.count,
      next: result.data.next,
      previous: result.data.previous,
      results,
    },
    error: null,
  };
}
