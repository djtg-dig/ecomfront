import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, connection: async () => undefined };
});

import { GET as startLogin } from "@/app/api/auth/carri/login/route";
import { POST as receiveHandoff } from "@/app/api/auth/carri/handoff/route";
import { POST as refreshSession } from "@/app/api/auth/refresh/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { BackendApiError, BackendNetworkError } from "@/lib/api/backend-client";
import { authenticationErrors } from "@/lib/auth/login-errors";
import {
  decryptSession,
  encryptSession,
  type EcommerceSession,
} from "@/lib/auth/session";

const frontendUrl = "http://localhost:3001";
const backendUrl = "http://localhost:8000";
const binding = "B".repeat(43);

function makeJwt(expiresAt: number): string {
  const claims = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
  return `header.${claims}.signature`;
}

function cookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function cookieValue(response: Response, name: string): string {
  const value = cookies(response).find((entry) => entry.startsWith(`${name}=`));
  if (!value) throw new Error(`Cookie ${name} absente.`);
  return value.slice(name.length + 1).split(";", 1)[0];
}

function localConfig() {
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontendUrl);
  vi.stubEnv("DJANGO_BACKEND_URL", backendUrl);
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web");
  vi.stubEnv("ECOMMERCE_HMAC_SECRET", "route-test-only-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "f".repeat(64));
  vi.stubEnv("NODE_ENV", "development");
}

function tokenPair() {
  return {
    access: makeJwt(Math.floor(Date.now() / 1000) + 900),
    refresh: makeJwt(Math.floor(Date.now() / 1000) + 86_400),
  };
}

function handoffRequest({
  handoff = "H".repeat(43),
  deliveryBinding = binding,
  cookieBinding = binding,
  origin = backendUrl,
  invitationReturn = false,
}: {
  handoff?: string;
  deliveryBinding?: string;
  cookieBinding?: string;
  origin?: string;
  invitationReturn?: boolean;
} = {}) {
  const form = new URLSearchParams({ handoff, delivery_binding: deliveryBinding });
  return new Request(`${frontendUrl}/api/auth/carri/handoff`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin,
      "sec-fetch-site": "same-site",
      cookie: `ecommerce_oauth_transaction=${cookieBinding}${invitationReturn ? "; ecommerce_invitation_return=1" : ""}`,
    },
    body: form,
  });
}

function callbackErrorRequest({
  error,
  deliveryBinding = binding,
  cookieBinding = binding,
  origin = backendUrl,
}: {
  error: string;
  deliveryBinding?: string;
  cookieBinding?: string;
  origin?: string;
}) {
  const form = new URLSearchParams({ error, delivery_binding: deliveryBinding });
  return new Request(`${frontendUrl}/api/auth/carri/handoff`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin,
      "sec-fetch-site": "same-site",
      cookie: `ecommerce_oauth_transaction=${cookieBinding}`,
    },
    body: form,
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  localConfig();
});

describe("routes d’authentification BFF", () => {
  it("démarre Django avec le binding et un cookie local HttpOnly same-site", async () => {
    const response = await startLogin(new Request(`${frontendUrl}/api/auth/carri/login`));
    const destination = new URL(response.headers.get("location") ?? "");
    const cookie = cookies(response).find((entry) => entry.startsWith("ecommerce_oauth_transaction="));

    expect(response.status).toBe(303);
    expect(destination.origin).toBe(backendUrl);
    expect(destination.pathname).toBe("/api/v1/auth/carri/login/");
    expect(destination.searchParams.get("delivery")).toBe("nextjs");
    expect(destination.searchParams.get("delivery_binding")).toHaveLength(43);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/api/auth/carri/handoff");
  });

  it("refuse une origine ou un binding différent sans consommer le handoff", async () => {
    const wrongOrigin = await receiveHandoff(handoffRequest({ origin: "https://attacker.example" }));
    const wrongBinding = await receiveHandoff(
      handoffRequest({ deliveryBinding: "A".repeat(43) }),
    );

    expect(new URL(wrongOrigin.headers.get("location") ?? "").searchParams.get("erreur"))
      .toBe("handoff_delivery_origin_invalid");
    expect(new URL(wrongBinding.headers.get("location") ?? "").searchParams.get("erreur"))
      .toBe("handoff_delivery_binding_invalid");
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("redirige access_denied vers la connexion, efface la transaction et ne crée pas de session", async () => {
    const response = await receiveHandoff(callbackErrorRequest({ error: "access_denied" }));
    const location = new URL(response.headers.get("location") ?? "");
    const transactionCookie = cookies(response).find((entry) => entry.startsWith("ecommerce_oauth_transaction="));

    expect(response.status).toBe(303);
    expect(location.origin).toBe(frontendUrl);
    expect(location.pathname).toBe("/connexion");
    expect(location.searchParams.get("erreur")).toBe("oauth_authorization_denied");
    expect(transactionCookie).toContain("Max-Age=0");
    expect(transactionCookie).toContain("HttpOnly");
    expect(transactionCookie).toContain("Path=/api/auth/carri/handoff");
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_session="))).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("redirige le refus d’e-mail non vérifié avec un code dédié sans créer de session", async () => {
    const response = await receiveHandoff(
      callbackErrorRequest({ error: "oauth_email_not_verified" }),
    );

    expect(new URL(response.headers.get("location") ?? "").searchParams.get("erreur"))
      .toBe("oauth_email_not_verified");
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_oauth_transaction=") && entry.includes("Max-Age=0"))).toBe(true);
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_session="))).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("préserve le code d’état OAuth invalide sans consommer le handoff", async () => {
    const response = await receiveHandoff(
      callbackErrorRequest({ error: "oauth_state_invalid_or_expired" }),
    );

    expect(new URL(response.headers.get("location") ?? "").searchParams.get("erreur"))
      .toBe("oauth_state_invalid_or_expired");
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_session="))).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("refuse une annulation liée à un autre binding sans effacer la transaction courante", async () => {
    const response = await receiveHandoff(callbackErrorRequest({
      error: "access_denied",
      deliveryBinding: "A".repeat(43),
    }));

    expect(new URL(response.headers.get("location") ?? "").searchParams.get("erreur"))
      .toBe("handoff_delivery_binding_invalid");
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_oauth_transaction=") && entry.includes("Max-Age=0"))).toBe(false);
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_session="))).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("ne reflète pas un code de refus inconnu ou hérité", async () => {
    const response = await receiveHandoff(callbackErrorRequest({ error: "toString" }));
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.origin).toBe(frontendUrl);
    expect(location.searchParams.get("erreur")).toBe("handoff_delivery_invalid");
    expect(location.search).not.toContain("toString");
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_session="))).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("permet une nouvelle tentative avec un binding neuf après annulation", async () => {
    const cancelled = await receiveHandoff(callbackErrorRequest({ error: "access_denied" }));
    const retry = await startLogin(new Request(`${frontendUrl}/api/auth/carri/login`));
    const previousBinding = cookieValue(cancelled, "ecommerce_oauth_transaction");
    const nextBinding = cookieValue(retry, "ecommerce_oauth_transaction");

    expect(previousBinding).toBe("");
    expect(nextBinding).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(nextBinding).not.toBe(binding);
    expect(new URL(retry.headers.get("location") ?? "").searchParams.get("delivery_binding"))
      .toBe(nextBinding);
  });

  it("autorise Origin opaque seulement en loopback same-site avec le binding", async () => {
    mocks.request.mockResolvedValue(tokenPair());
    const response = await receiveHandoff(handoffRequest({ origin: "null" }));

    expect(response.status).toBe(303);
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it("consomme par HMAC et ne remet que le cookie chiffré au navigateur", async () => {
    mocks.request.mockResolvedValue(tokenPair());
    const response = await receiveHandoff(handoffRequest());
    const sessionCookie = cookies(response).find((entry) => entry.startsWith("ecommerce_session="));

    expect(mocks.request).toHaveBeenCalledWith(
      "/api/v1/auth/carri/handoff/consume/",
      { method: "POST", json: { handoff: "H".repeat(43) } },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${frontendUrl}/espace`);
    expect(response.body).toBeNull();
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("SameSite=lax");
    expect(sessionCookie).toContain("Path=/");
    expect(sessionCookie).not.toContain("Max-Age=0");
    expect(sessionCookie).not.toContain(tokenPair().access);
  });

  it("ignore un ancien marqueur d’invitation et revient toujours vers l’espace", async () => {
    mocks.request.mockResolvedValue(tokenPair());
    const response = await receiveHandoff(handoffRequest({ invitationReturn: true }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${frontendUrl}/espace`);
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_invitation_return=") && entry.includes("Max-Age=0"))).toBe(true);
  });

  it("distingue une indisponibilité de Django d'un échec de handoff", async () => {
    mocks.request.mockRejectedValueOnce(new BackendNetworkError());
    const unavailable = await receiveHandoff(handoffRequest());
    mocks.request.mockRejectedValueOnce(new BackendApiError(503, "upstream_unavailable", "Indisponible"));
    const serverError = await receiveHandoff(handoffRequest());

    expect(new URL(unavailable.headers.get("location") ?? "").searchParams.get("erreur"))
      .toBe("backend_unavailable");
    expect(new URL(serverError.headers.get("location") ?? "").searchParams.get("erreur"))
      .toBe("backend_unavailable");
  });

  it("conserve les messages distincts pour indisponibilité, annulation, expiration et handoff", () => {
    expect(authenticationErrors.oauth_provider_unavailable)
      .toBe("Le service de connexion Carri Account est temporairement indisponible. Veuillez réessayer dans quelques instants.");
    expect(authenticationErrors.backend_unavailable)
      .toBe("Le service E-commerce est temporairement indisponible. Vérifiez votre connexion Internet et réessayez.");
    expect(authenticationErrors.internet_interrupted)
      .toBe("Connexion Internet interrompue. Vérifiez votre réseau, puis réessayez.");
    expect(authenticationErrors.session_expired)
      .toBe("Votre session a expiré. Veuillez vous reconnecter.");
    expect(authenticationErrors.oauth_authorization_denied)
      .toBe("Connexion annulée. Vous avez refusé l'autorisation de connexion avec Carri Account.");
    expect(authenticationErrors.handoff_delivery_failed)
      .toBe("La connexion n'a pas pu être finalisée. Veuillez réessayer.");
  });

  it("serialize les refresh concurrents sur la même rotation", async () => {
    const oldSession: EcommerceSession = {
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 1),
      refreshToken: makeJwt(Math.floor(Date.now() / 1000) + 86_477),
      accessExpiresAt: Date.now() - 1000,
      refreshExpiresAt: Date.now() + 86_400_000,
    };
    const oldCookie = encryptSession(oldSession);
    mocks.request.mockResolvedValue(tokenPair());
    const request = () => new Request(`${frontendUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        origin: frontendUrl,
        "sec-fetch-site": "same-origin",
        "x-csrf-protection": "1",
        cookie: `ecommerce_session=${oldCookie}`,
      },
    });

    const responses = await Promise.all([refreshSession(request()), refreshSession(request())]);

    expect(responses.map((response) => response.status)).toEqual([204, 204]);
    expect(mocks.request).toHaveBeenCalledTimes(1);
    const sessionValues = responses.map((response) => {
      const value = cookieValue(response, "ecommerce_session");
      return decryptSession(value);
    });
    expect(sessionValues[0]).toEqual(sessionValues[1]);
  });

  it("refuse le logout sans preuve CSRF same-origin et efface la session localement", async () => {
    const rejected = await logout(new Request(`${frontendUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
        "x-csrf-protection": "1",
      },
    }));
    const accepted = await logout(new Request(`${frontendUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        origin: frontendUrl,
        "sec-fetch-site": "same-origin",
        "x-csrf-protection": "1",
      },
    }));

    expect(rejected.status).toBe(403);
    expect(accepted.status).toBe(204);
    expect(cookies(accepted).some((entry) => entry.startsWith("ecommerce_session=") && entry.includes("Max-Age=0"))).toBe(true);
  });

  it("révoque la session Django avant d’effacer le cookie local", async () => {
    mocks.request.mockResolvedValueOnce(undefined);
    const activeSession: EcommerceSession = {
      accessToken: makeJwt(Math.floor(Date.now() / 1000) + 900),
      refreshToken: makeJwt(Math.floor(Date.now() / 1000) + 86_400),
      accessExpiresAt: Date.now() + 900_000,
      refreshExpiresAt: Date.now() + 86_400_000,
    };
    const response = await logout(new Request(`${frontendUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        origin: frontendUrl,
        "sec-fetch-site": "same-origin",
        "x-csrf-protection": "1",
        cookie: `ecommerce_session=${encryptSession(activeSession)}`,
      },
    }));

    expect(response.status).toBe(204);
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/auth/logout/", {
      method: "POST",
      accessToken: activeSession.accessToken,
    });
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_session=") && entry.includes("Max-Age=0"))).toBe(true);
  });

  it("renouvelle une session expirée avant de la révoquer", async () => {
    const refreshed = tokenPair();
    mocks.request.mockResolvedValueOnce(refreshed).mockResolvedValueOnce(undefined);
    const activeSession: EcommerceSession = {
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 1),
      refreshToken: makeJwt(Math.floor(Date.now() / 1000) + 86_400),
      accessExpiresAt: Date.now() - 1_000,
      refreshExpiresAt: Date.now() + 86_400_000,
    };
    const response = await logout(new Request(`${frontendUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        origin: frontendUrl,
        "sec-fetch-site": "same-origin",
        "x-csrf-protection": "1",
        cookie: `ecommerce_session=${encryptSession(activeSession)}`,
      },
    }));

    expect(response.status).toBe(204);
    expect(mocks.request).toHaveBeenNthCalledWith(1, "/api/v1/auth/token/refresh/", {
      method: "POST",
      json: { refresh: activeSession.refreshToken },
    });
    expect(mocks.request).toHaveBeenNthCalledWith(2, "/api/v1/auth/logout/", {
      method: "POST",
      accessToken: refreshed.access,
    });
  });

  it("efface quand même le cookie si la révocation serveur est indisponible", async () => {
    mocks.request.mockRejectedValueOnce(new BackendNetworkError());
    const activeSession: EcommerceSession = {
      accessToken: makeJwt(Math.floor(Date.now() / 1000) + 900),
      refreshToken: makeJwt(Math.floor(Date.now() / 1000) + 86_400),
      accessExpiresAt: Date.now() + 900_000,
      refreshExpiresAt: Date.now() + 86_400_000,
    };
    const response = await logout(new Request(`${frontendUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        origin: frontendUrl,
        "sec-fetch-site": "same-origin",
        "x-csrf-protection": "1",
        cookie: `ecommerce_session=${encryptSession(activeSession)}`,
      },
    }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("logout_revocation_unavailable");
    expect(cookies(response).some((entry) => entry.startsWith("ecommerce_session=") && entry.includes("Max-Age=0"))).toBe(true);
  });
});
