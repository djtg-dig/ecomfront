import "server-only";

/** Header names defined by the backend's Ecommerce-HMAC v1 contract. */
export const ecommerceHmacHeaders = {
  clientId: "X-Ecommerce-Client-Id",
  timestamp: "X-Ecommerce-Timestamp",
  nonce: "X-Ecommerce-Nonce",
  contentSha256: "X-Ecommerce-Content-SHA256",
  version: "X-Ecommerce-Signature-Version",
  signature: "X-Ecommerce-Signature",
} as const;

export const ecommerceHmacVersion = "v1";

export type HmacRequest = {
  method: string;
  path: string;
  query?: string | URLSearchParams;
  body: Uint8Array;
};
