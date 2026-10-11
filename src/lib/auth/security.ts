import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { ServerConfig } from "@/lib/config/server";

export const transactionCookieName = "ecommerce_oauth_transaction";
export const transactionCookiePath = "/api/auth/carri/handoff";
export const csrfHeaderName = "x-csrf-protection";

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function isLocalSameSiteConfig(config: ServerConfig): boolean {
  const frontend = new URL(config.frontendUrl);
  const backend = new URL(config.backendUrl);
  return process.env.NODE_ENV !== "production" &&
    frontend.protocol === "http:" &&
    backend.protocol === "http:" &&
    frontend.hostname === backend.hostname &&
    isLoopback(frontend.hostname);
}

export function transactionCookieOptions(config: ServerConfig) {
  const frontend = new URL(config.frontendUrl);
  const backend = new URL(config.backendUrl);
  const localSameSite = isLocalSameSiteConfig(config);

  if (localSameSite) {
    return { secure: false, sameSite: "lax" as const };
  }

  if (frontend.protocol !== "https:" || backend.protocol !== "https:") {
    throw new Error("La livraison OAuth inter-origines exige HTTPS pour SameSite=None.");
  }

  return { secure: true, sameSite: "none" as const };
}

export function requestCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
    return pair.slice(separator + 1).trim();
  }
  return null;
}

export function secureEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function isSameOriginMutation(request: Request, config: ServerConfig): boolean {
  return request.headers.get("origin") === config.frontendUrl &&
    request.headers.get("sec-fetch-site") === "same-origin" &&
    request.headers.get(csrfHeaderName) === "1";
}