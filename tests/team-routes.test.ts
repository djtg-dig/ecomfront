import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET as getTeam, POST as createInvitation } from "@/app/api/private/businesses/[businessId]/team/route";
import { POST as invitationAction } from "@/app/api/private/businesses/[businessId]/team/[invitationId]/[action]/route";
import { BackendApiError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";

const frontendUrl = "http://localhost:3001";
const businessId = "BUSINESS123";
const invitationId = "INVITATION123";

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

function authenticatedRequest(path: string, init: RequestInit = {}) {
  return new Request(`${frontendUrl}${path}`, {
    ...init,
    headers: {
      cookie: `ecommerce_session=${encryptSession(session())}`,
      ...init.headers,
    },
  });
}

function mutationRequest(path: string, body = "{}") {
  return authenticatedRequest(path, {
    method: "POST",
    headers: {
      origin: frontendUrl,
      "sec-fetch-site": "same-origin",
      "x-csrf-protection": "1",
      "content-type": "application/json",
    },
    body,
  });
}

const teamParams = { params: Promise.resolve({ businessId }) };
const actionParams = (action: string, values = { businessId, invitationId }) => ({
  params: Promise.resolve({ ...values, action }),
});

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontendUrl);
  vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000");
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web");
  vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64));
  vi.stubEnv("NODE_ENV", "development");
});

describe("routes BFF membres et invitations", () => {
  it("consulte les membres et invitations autorisés sans exposer les JWT", async () => {
    mocks.request
      .mockResolvedValueOnce({ permissions: ["MEMBER_VIEW", "INVITATION_VIEW"] })
      .mockResolvedValueOnce({ results: [{ public_id: "MEMBER123", role: "ADMIN" }] })
      .mockResolvedValueOnce({ results: [{ public_id: invitationId, email: "team@example.test", status: "PENDING" }] });

    const response = await getTeam(authenticatedRequest(`/api/private/businesses/${businessId}/team`), teamParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      members: { results: [{ public_id: "MEMBER123", role: "ADMIN" }] },
      invitations: { results: [{ public_id: invitationId, email: "team@example.test", status: "PENDING" }] },
    });
    expect(JSON.stringify(body)).not.toMatch(/accessToken|refreshToken|signature/);
    expect(mocks.request).toHaveBeenNthCalledWith(
      2,
      `/api/v1/businesses/${businessId}/members/`,
      expect.objectContaining({
        accessToken: expect.any(String),
        query: { page: "1", page_size: "50" },
      }),
    );
    expect(mocks.request).toHaveBeenNthCalledWith(3, `/api/v1/businesses/${businessId}/invitations/`, expect.objectContaining({ accessToken: expect.any(String) }));
  });

  it("crée une invitation valide et relaie l’erreur de validation backend", async () => {
    mocks.request.mockResolvedValueOnce({ public_id: invitationId, status: "PENDING" });
    const created = await createInvitation(
      mutationRequest(`/api/private/businesses/${businessId}/team`, JSON.stringify({ email: "new@example.test", title: "Caissier", permissions: ["PRODUCT_VIEW"] })),
      teamParams,
    );
    expect(created.status).toBe(201);
    expect(mocks.request).toHaveBeenLastCalledWith(
      `/api/v1/businesses/${businessId}/invitations/`,
      expect.objectContaining({ method: "POST", json: { email: "new@example.test", title: "Caissier", permissions: ["PRODUCT_VIEW"] } }),
    );

    mocks.request.mockRejectedValueOnce(new BackendApiError(400, "invalid_email", "E-mail invalide."));
    const invalid = await createInvitation(mutationRequest(`/api/private/businesses/${businessId}/team`, "{}"), teamParams);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ code: "invalid_request", detail: "E-mail invalide." });
  });

  it.each(["resend", "revoke"])("exécute l’action d’invitation autorisée %s", async (action) => {
    mocks.request.mockResolvedValueOnce({ public_id: invitationId, status: action === "revoke" ? "REVOKED" : "PENDING" });
    const response = await invitationAction(
      mutationRequest(`/api/private/businesses/${businessId}/team/${invitationId}/${action}`),
      actionParams(action),
    );

    expect(response.status).toBe(200);
    expect(mocks.request).toHaveBeenCalledWith(
      `/api/v1/businesses/${businessId}/invitations/${invitationId}/${action}/`,
      expect.objectContaining({ method: "POST", json: {} }),
    );
  });

  it("renvoie 401 et détruit la session quand elle est absente", async () => {
    const response = await getTeam(new Request(`${frontendUrl}/api/private/businesses/${businessId}/team`), teamParams);
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("session_expired");
    expect(response.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
  });

  it("masque l’accès hors périmètre derrière un refus générique", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(404, "business_not_found", "Entreprise 42 inexistante."));
    const response = await getTeam(authenticatedRequest(`/api/private/businesses/${businessId}/team`), teamParams);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "resource_not_allowed", detail: "Cette ressource n’est pas accessible." });
  });

  it("préserve le refus de permission explicite", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(403, "forbidden", "Permission refusée."));
    const response = await createInvitation(mutationRequest(`/api/private/businesses/${businessId}/team`), teamParams);
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("access_forbidden");
  });

  it("préserve un conflit d’invitation", async () => {
    mocks.request.mockRejectedValueOnce(new BackendApiError(409, "invitation_exists", "Invitation déjà active."));
    const response = await createInvitation(mutationRequest(`/api/private/businesses/${businessId}/team`), teamParams);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "conflict", detail: "Invitation déjà active." });
  });

  it("préserve les conflits métier nécessitant un administrateur", async () => {
    mocks.request
      .mockResolvedValueOnce({ permissions: ["MEMBER_VIEW"] })
      .mockRejectedValueOnce(new BackendApiError(409, "business_member_removed", "Votre ancienne adhésion a été retirée."));

    const response = await getTeam(authenticatedRequest(`/api/private/businesses/${businessId}/team`), teamParams);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "business_member_removed",
      detail: "Votre ancienne adhésion a été retirée.",
    });
  });

  it("bloque toute mutation cross-site avant l’appel backend", async () => {
    const response = await createInvitation(
      authenticatedRequest(`/api/private/businesses/${businessId}/team`, {
        method: "POST",
        headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site", "content-type": "application/json" },
        body: "{}",
      }),
      teamParams,
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("csrf_rejected");
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("rafraîchit une fois puis rejoue l’appel ayant reçu 401", async () => {
    mocks.request
      .mockRejectedValueOnce(new BackendApiError(401, "invalid_token", "Expired"))
      .mockResolvedValueOnce({ access: jwt(Math.floor(Date.now() / 1000) + 900), refresh: jwt(Math.floor(Date.now() / 1000) + 86_400) })
      .mockResolvedValueOnce({ permissions: ["MEMBER_VIEW", "INVITATION_VIEW"] })
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [] });

    const response = await getTeam(authenticatedRequest(`/api/private/businesses/${businessId}/team`), teamParams);
    expect(response.status).toBe(200);
    expect(mocks.request).toHaveBeenCalledTimes(5);
    expect(response.headers.getSetCookie().join("\n")).toContain("ecommerce_session=");
  });

  it("valide les identifiants et les actions avant tout appel backend", async () => {
    const invalidBusiness = await getTeam(authenticatedRequest("/api/private/businesses/../team"), {
      params: Promise.resolve({ businessId: "../" }),
    });
    expect(invalidBusiness.status).toBe(400);
    expect((await invalidBusiness.json()).code).toBe("invalid_business_id");

    const invalidInvitation = await invitationAction(
      mutationRequest(`/api/private/businesses/${businessId}/team/../revoke`),
      actionParams("revoke", { businessId, invitationId: "../" }),
    );
    expect(invalidInvitation.status).toBe(400);
    expect((await invalidInvitation.json()).code).toBe("invalid_identifier");

    const invalidAction = await invitationAction(
      mutationRequest(`/api/private/businesses/${businessId}/team/${invitationId}/promote`),
      actionParams("promote"),
    );
    expect(invalidAction.status).toBe(400);
    expect((await invalidAction.json()).code).toBe("invalid_action");
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
