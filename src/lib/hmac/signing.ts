import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";

import {
  ecommerceHmacHeaders,
  ecommerceHmacVersion,
  type HmacRequest,
} from "@/lib/hmac/contract";

const encoder = new TextEncoder();

type SigningConfig = { clientId: string; secret: string };
type SigningOptions = { nonce?: string; timestamp?: number };

function formEncode(value: string): string {
  return [...encoder.encode(value)]
    .map((byte) => {
      const character = String.fromCharCode(byte);
      if (
        (byte >= 0x41 && byte <= 0x5a) ||
        (byte >= 0x61 && byte <= 0x7a) ||
        (byte >= 0x30 && byte <= 0x39) ||
        "-_.~".includes(character)
      ) return character;
      return byte === 0x20 ? "+" : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    })
    .join("");
}

function formDecode(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

export function canonicalizePathAndQuery(path: string, query: string | URLSearchParams = ""): string {
  const source = typeof query === "string" ? query : query.toString();
  const pairs = source
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      return [
        formDecode(separator === -1 ? part : part.slice(0, separator)),
        formDecode(separator === -1 ? "" : part.slice(separator + 1)),
      ] as const;
    })
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
      }
      return leftKey < rightKey ? -1 : 1;
    });
  const canonicalQuery = pairs.map(([key, value]) => `${formEncode(key)}=${formEncode(value)}`).join("&");
  return canonicalQuery ? `${path || "/"}?${canonicalQuery}` : path || "/";
}

export function sha256Hex(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

export function buildCanonicalRequest(clientId: string, request: HmacRequest, timestamp: number, nonce: string, bodySha256: string): string {
  return [
    ecommerceHmacVersion, clientId, String(timestamp), nonce, request.method.toUpperCase(),
    canonicalizePathAndQuery(request.path, request.query), bodySha256,
  ].join("\n");
}

export function signEcommerceRequest(config: SigningConfig, request: HmacRequest, options: SigningOptions = {}): Record<string, string> {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const nonce = options.nonce ?? randomUUID();
  const bodySha256 = sha256Hex(request.body);
  const canonical = buildCanonicalRequest(config.clientId, request, timestamp, nonce, bodySha256);
  const signature = createHmac("sha256", config.secret).update(canonical, "utf8").digest("hex");
  return {
    [ecommerceHmacHeaders.clientId]: config.clientId,
    [ecommerceHmacHeaders.timestamp]: String(timestamp),
    [ecommerceHmacHeaders.nonce]: nonce,
    [ecommerceHmacHeaders.contentSha256]: bodySha256,
    [ecommerceHmacHeaders.version]: ecommerceHmacVersion,
    [ecommerceHmacHeaders.signature]: signature,
  };
}
