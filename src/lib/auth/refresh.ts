import "server-only";

import { createHash } from "node:crypto";

import { BackendApiError, backendClient } from "@/lib/api/backend-client";
import {
  createEcommerceSession,
  type EcommerceSession,
  type EcommerceTokenPair,
} from "@/lib/auth/session";

const REFRESH_RESULT_TTL_MS = 60_000;
const MAX_REFRESH_RESULTS = 512;

type RefreshState = {
  inFlight: Map<string, Promise<EcommerceSession>>;
  completed: Map<string, { session: EcommerceSession; expiresAt: number }>;
};

const runtime = globalThis as typeof globalThis & {
  __ecommerceRefreshState?: RefreshState;
};

const refreshState = (runtime.__ecommerceRefreshState ??= {
  inFlight: new Map(),
  completed: new Map(),
});

function refreshKey(refreshToken: string): string {
  return createHash("sha256").update(refreshToken, "utf8").digest("hex");
}

export function coordinateRefresh(
  refreshToken: string,
  operation: () => Promise<EcommerceSession>,
  now = Date.now(),
): Promise<EcommerceSession> {
  const key = refreshKey(refreshToken);
  for (const [cachedKey, result] of refreshState.completed) {
    if (result.expiresAt <= now) {
      refreshState.completed.delete(cachedKey);
    }
  }

  const completed = refreshState.completed.get(key);
  if (completed) {
    refreshState.completed.delete(key);
    refreshState.completed.set(key, completed);
    return Promise.resolve(completed.session);
  }

  const current = refreshState.inFlight.get(key);
  if (current) return current;

  const refresh = operation().then((session) => {
    refreshState.completed.set(key, {
      session,
      expiresAt: Date.now() + REFRESH_RESULT_TTL_MS,
    });
    while (refreshState.completed.size > MAX_REFRESH_RESULTS) {
      const oldestKey = refreshState.completed.keys().next().value;
      if (oldestKey === undefined) break;
      refreshState.completed.delete(oldestKey);
    }
    return session;
  });

  refreshState.inFlight.set(key, refresh);
  void refresh.finally(() => {
    if (refreshState.inFlight.get(key) === refresh) {
      refreshState.inFlight.delete(key);
    }
  }).catch(() => undefined);

  return refresh;
}

export async function refreshEcommerceSession(
  session: EcommerceSession,
  options: { force?: boolean } = {},
): Promise<EcommerceSession> {
  if (!options.force && session.accessExpiresAt > Date.now() + 30_000) return session;

  return coordinateRefresh(session.refreshToken, async () => {
    const tokens = await backendClient.request<EcommerceTokenPair>(
      "/api/v1/auth/token/refresh/",
      {
        method: "POST",
        json: { refresh: session.refreshToken },
      },
    );
    if (!tokens) {
      throw new BackendApiError(502, null, "Le renouvellement de session a échoué.");
    }
    return createEcommerceSession(tokens);
  });
}
