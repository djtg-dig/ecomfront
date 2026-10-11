import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const sessionCookieName = "ecommerce_session";
const SESSION_VERSION = "v1";
const MAX_ENCRYPTED_SESSION_LENGTH = 3500;

export type EcommerceTokenPair = {
  access: string;
  refresh: string;
};

export type EcommerceSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
};

function encryptionKey(): Buffer {
  const configured = process.env.SESSION_ENCRYPTION_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(configured)) {
    throw new Error("La clé de chiffrement de session doit contenir 32 octets en hexadécimal.");
  }
  return Buffer.from(configured, "hex");
}

export function assertSessionEncryptionConfigured(): void {
  encryptionKey();
}

export function sessionCookieOptions(maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_FRONTEND_URL?.startsWith("https://") === true;
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(0, maxAge),
    priority: "high" as const,
  };
}

function tokenExpiration(token: string): number {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Le service E-commerce a retourné un jeton invalide.");
  }

  try {
    const claims = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) {
      throw new Error("Le service E-commerce a retourné un jeton invalide.");
    }
    return claims.exp * 1000;
  } catch {
    throw new Error("Le service E-commerce a retourné un jeton invalide.");
  }
}

export function createEcommerceSession(tokens: EcommerceTokenPair): EcommerceSession {
  if (!tokens || typeof tokens.access !== "string" || typeof tokens.refresh !== "string") {
    throw new Error("La réponse d'authentification est invalide.");
  }

  return {
    accessToken: tokens.access,
    refreshToken: tokens.refresh,
    accessExpiresAt: tokenExpiration(tokens.access),
    refreshExpiresAt: tokenExpiration(tokens.refresh),
  };
}

export function encryptSession(session: EcommerceSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const encrypted = [
    SESSION_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");

  if (Buffer.byteLength(encrypted, "ascii") > MAX_ENCRYPTED_SESSION_LENGTH) {
    throw new Error("La session dépasse la taille de cookie autorisée.");
  }
  return encrypted;
}

export function decryptSession(value: string): EcommerceSession | null {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = value.split(".");
  if (version !== SESSION_VERSION || !encodedIv || !encodedTag || !encodedCiphertext || extra) {
    return null;
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(encodedIv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const session = JSON.parse(plaintext) as Partial<EcommerceSession>;

    if (
      typeof session.accessToken !== "string" ||
      typeof session.refreshToken !== "string" ||
      typeof session.accessExpiresAt !== "number" ||
      typeof session.refreshExpiresAt !== "number"
    ) {
      return null;
    }

    return session as EcommerceSession;
  } catch {
    return null;
  }
}

export async function readEcommerceSession(): Promise<EcommerceSession | null> {
  const cookie = (await cookies()).get(sessionCookieName)?.value;
  return cookie ? decryptSession(cookie) : null;
}
