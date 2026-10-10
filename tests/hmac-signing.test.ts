import { describe, expect, it } from "vitest";

import {
  canonicalizePathAndQuery,
  sha256Hex,
  signEcommerceRequest,
} from "@/lib/hmac/signing";

const encoder = new TextEncoder();
const config = { clientId: "ecommerce-web", secret: "demo-shared-secret-not-a-real-key" };

function sign(method: string, path: string, query: string, body: string, timestamp: number, nonce: string) {
  return signEcommerceRequest(
    config,
    { method, path, query, body: encoder.encode(body) },
    { timestamp, nonce },
  );
}

describe("Ecommerce-HMAC v1", () => {
  it("reproduit le vecteur Django GET avec query", () => {
    expect(sign("GET", "/api/v1/businesses/", "page=2&page_size=20", "", 1760000000, "5f2b7c1e-9a3d-4c8e-b1a6-0d4e2f8c9a01")["X-Ecommerce-Signature"]).toBe(
      "f9ed028a8aea2533d551fba8f86197906edfa2cafefdb191ba37b0bacb86e6bb",
    );
  });

  it("reproduit le vecteur Django POST JSON", () => {
    const body = '{"email":"membre@example.com","title":"Caissier"}';
    const headers = sign("POST", "/api/v1/businesses/SH23456789AB/invitations/", "", body, 1760000100, "8c1d4e2a-7b93-4f05-9d6a-3e5c7a1b2d40");
    expect(headers["X-Ecommerce-Content-SHA256"]).toBe("26588659a66e2d544f2dc0252081ee2c3225bb9a5eb4b0edbbda96eeeb60e930");
    expect(headers["X-Ecommerce-Signature"]).toBe("ffe9356b7e5814534731aa8644e0cca7156b19ee6c3819c5f58eeb61a454d52c");
  });

  it("reproduit le vecteur Django GET sans query", () => {
    expect(sign("GET", "/api/v1/me/business-invitations/MI23456789AB/accept/", "", "", 1760000200, "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")["X-Ecommerce-Signature"]).toBe(
      "db4a311f9bf026d663dd1ca806c405e55f32c383fb8292345656ee8ba616fa84",
    );
  });

  it("préserve les valeurs vides, répétées et les caractères spéciaux", () => {
    expect(canonicalizePathAndQuery("/api/v1/items/", "tag=b&empty=&tag=a&q=un+mot+%26+%C3%A9")).toBe(
      "/api/v1/items/?empty=&q=un+mot+%26+%C3%A9&tag=a&tag=b",
    );
  });

  it("signe les octets du corps et distingue les méthodes et slashs", () => {
    expect(sha256Hex(encoder.encode(""))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    const first = sign("PATCH", "/api/v1/items", "a=1", "{\"é\":1}", 1, "nonce")["X-Ecommerce-Signature"];
    const second = sign("PUT", "/api/v1/items/", "a=1", "{\"é\":1}", 1, "nonce")["X-Ecommerce-Signature"];
    expect(first).not.toBe(second);
  });
});
