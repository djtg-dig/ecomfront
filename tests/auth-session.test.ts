import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createEcommerceSession,
  decryptSession,
  encryptSession,
} from "@/lib/auth/session";

function makeJwt(expiresAt: number): string {
  const claims = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
  return `header.${claims}.signature`;
}

afterEach(() => vi.unstubAllEnvs());

describe("chiffrement de session BFF", () => {
  it("chiffre les JWT et protège leur intégrité", () => {
    vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64));
    const tokens = {
      access: makeJwt(1_800_000_000),
      refresh: makeJwt(1_900_000_000),
    };
    const session = createEcommerceSession(tokens);
    const encrypted = encryptSession(session);

    expect(encrypted).not.toContain(tokens.access);
    expect(encrypted).not.toContain(tokens.refresh);
    expect(decryptSession(encrypted)).toEqual(session);
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    const changedCiphertext = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
    expect(decryptSession([version, iv, tag, changedCiphertext].join("."))).toBeNull();
  });

  it("refuse une clé de chiffrement absente ou mal formée", () => {
    vi.stubEnv("SESSION_ENCRYPTION_KEY", "invalid");

    expect(() => encryptSession({
      accessToken: "access",
      refreshToken: "refresh",
      accessExpiresAt: 1,
      refreshExpiresAt: 2,
    })).toThrow("32 octets");
  });

  it("refuse une réponse backend sans expiration JWT", () => {
    expect(() => createEcommerceSession({ access: "not-jwt", refresh: "not-jwt" })).toThrow(
      "jeton invalide",
    );
  });
});
