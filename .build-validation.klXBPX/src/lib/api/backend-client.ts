import "server-only";

import { getServerConfig } from "@/lib/config/server";
import { signEcommerceRequest } from "@/lib/hmac/signing";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParameters = Record<string, QueryValue | QueryValue[]>;
export type BackendMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type BackendClientConfig = {
  backendUrl: string;
  hmacClientId: string;
  hmacSecret: string;
};

type BackendRequestOptions = {
  method?: BackendMethod;
  query?: QueryParameters;
  json?: unknown;
  accessToken?: string;
  timeoutMs?: number;
};

type FetchImplementation = typeof fetch;

export class BackendApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "BackendApiError";
  }
}

export class BackendNetworkError extends Error {
  constructor() {
    super("Le service E-commerce est temporairement indisponible.");
    this.name = "BackendNetworkError";
  }
}

function appendQuery(url: URL, query: QueryParameters = {}) {
  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value !== undefined) {
        url.searchParams.append(key, value === null ? "" : String(value));
      }
    }
  }
}

function assertBackendPath(path: string) {
  if (!path.startsWith("/api/v1/")) {
    throw new Error("Le client BFF accepte uniquement les chemins Django /api/v1/.");
  }
}

async function readError(response: Response): Promise<BackendApiError> {
  try {
    const payload = (await response.json()) as { code?: unknown; detail?: unknown };
    return new BackendApiError(
      response.status,
      typeof payload.code === "string" ? payload.code : null,
      typeof payload.detail === "string" ? payload.detail : "La requête a été refusée par le service E-commerce.",
    );
  } catch {
    return new BackendApiError(response.status, null, "La requête a été refusée par le service E-commerce.");
  }
}

export function createBackendClient(
  config: BackendClientConfig,
  fetchImplementation: FetchImplementation = fetch,
) {
  return {
    async request<T = undefined>(
      path: string,
      options: BackendRequestOptions = {},
    ): Promise<T | undefined> {
      assertBackendPath(path);
      const method = options.method ?? "GET";
      const url = new URL(path, `${config.backendUrl.replace(/\/$/, "")}/`);
      appendQuery(url, options.query);
      const body = options.json === undefined ? undefined : JSON.stringify(options.json);
      const bodyBytes = new TextEncoder().encode(body ?? "");
      const hmacHeaders = signEcommerceRequest(
        { clientId: config.hmacClientId, secret: config.hmacSecret },
        { method, path: url.pathname, query: url.search.slice(1), body: bodyBytes },
      );
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

      try {
        const response = await fetchImplementation(url, {
          method,
          body,
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
            ...hmacHeaders,
          },
        });

        if (!response.ok) {
          throw await readError(response);
        }
        if (response.status === 204 || response.headers.get("content-length") === "0") {
          return undefined;
        }
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof BackendApiError) {
          throw error;
        }
        throw new BackendNetworkError();
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const backendClient = {
  request<T = undefined>(path: string, options?: BackendRequestOptions) {
    const config = getServerConfig();
    return createBackendClient(config).request<T>(path, options);
  },
};
