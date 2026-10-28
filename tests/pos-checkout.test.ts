import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/backend-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/backend-client")>();
  return { ...actual, backendClient: { request: mocks.request } };
});

import { GET as search } from "@/app/api/private/businesses/[businessId]/products/pos/search/route";
import { BackendApiError } from "@/lib/api/backend-client";
import { encryptSession, type EcommerceSession } from "@/lib/auth/session";
import { message } from "@/lib/i18n/messages";

const frontend = "http://localhost:3001";
const businessId = "BUS123";
const context = { params: Promise.resolve({ businessId }) };
const source = readFileSync(resolve(process.cwd(), "src/components/sales/pos-checkout.tsx"), "utf8");

function jwt(exp: number) { return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`; }
function session(): EcommerceSession { return { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: jwt(Math.floor(Date.now() / 1000) + 86_400), accessExpiresAt: Date.now() + 900_000, refreshExpiresAt: Date.now() + 86_400_000 }; }
function request(path: string) { return new Request(`${frontend}${path}`, { headers: { cookie: `ecommerce_session=${encryptSession(session())}` } }); }

beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", frontend); vi.stubEnv("DJANGO_BACKEND_URL", "http://localhost:8000");
  vi.stubEnv("ECOMMERCE_HMAC_CLIENT_ID", "ecommerce-web"); vi.stubEnv("ECOMMERCE_HMAC_SECRET", "test-secret");
  vi.stubEnv("SESSION_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("NODE_ENV", "development");
});

describe("caisse POS", () => {
  it("relaye exclusivement la recherche POS tenant-scopée", async () => {
    mocks.request.mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{ type: "VARIANT", public_id: "PV1" }] });
    const response = await search(request(`/api/private/businesses/${businessId}/products/pos/search?q=code&page_size=20`), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ products: [{ type: "VARIANT", public_id: "PV1" }], pagination: { count: 1, next: null, previous: null } });
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/businesses/${businessId}/products/pos/search/`, expect.objectContaining({ query: { q: "code", page_size: "20" } }));
  });

  it("refuse les recherches invalides et masque une entreprise étrangère", async () => {
    expect((await search(request(`/api/private/businesses/${businessId}/products/pos/search?q=`), context)).status).toBe(400);
    expect(mocks.request).not.toHaveBeenCalled();
    mocks.request.mockRejectedValueOnce(new BackendApiError(404, "not_found", "Inconnue"));
    const response = await search(request("/api/private/businesses/OTHER999/products/pos/search?q=code"), { params: Promise.resolve({ businessId: "OTHER999" }) });
    expect(response.status).toBe(403);
  });

  it("protège le flux brouillon-lignes-total-finalisation et les erreurs de reprise", () => {
    for (const fragment of [
      '"SALE_VIEW", "SALE_CREATE", "SALE_LINE_CREATE", "SALE_COMPLETE"',
      'operation_type: "DIRECT_SALE"',
      '/sales/${currentSale.public_id}/lines',
      'setSale(await getSale(currentSale.public_id))',
      'amount_paid: sale.total',
      'payment_method: method',
      'setPhase("uncertain")',
      'setSynced((current)',
      'setCart([]); setSynced({}); setMethod("")',
      'window.setTimeout',
    ]) expect(source).toContain(fragment);
    expect(source).toContain('line.type === "PRODUCT" ? "product" : "variant"');
    expect(source).toContain('entry.name');
    expect(source).toContain('value={entry.category}');
  });

  it("présente les contrôles POS accessibles sans changer le contrat métier", () => {
    for (const icon of ["Search", "ShoppingCart", "Plus", "Minus", "Trash2", "Package", "CreditCard", "CheckCircle2"]) expect(source).toContain(icon);
    for (const fragment of [
      'lg:grid-cols-[minmax(0,1.85fr)_minmax(20rem,1fr)]',
      "lg:sticky lg:top-20",
      "available_quantity",
      "allows_decimal_quantity",
      "maximumUnits",
      "wholeQuantityRequired",
      "stockInsufficient",
      "cartCount",
      "setQuantity(line",
      'aria-label={`${t("pos", "remove")} ${line.name}`}',
      'aria-label={`${t("pos", "add")} ${product.name}`}',
      "activeMethods.map",
      'bg-[var(--surface-muted)]',
    ]) expect(source).toContain(fragment);
    expect(source).toContain('const existing = current.find((line) => keyOf(line) === itemKey)');
    expect(source).toContain('setCart([]); setSynced({}); setMethod("")');
  });

  it("applique les règles d’unité et des erreurs compréhensibles en français et en anglais", () => {
    expect(source).toContain('units % quantityScale !== 0');
    expect(source).toContain('step={line.allows_decimal_quantity ? "0.001" : "1"}');
    expect(source).toContain('failure.lineKey = lineKey');
    expect(source).toContain('failure.errors?.target_public_id');
    expect(source).not.toContain('setError(reason instanceof Error ? reason.message');
    expect(message("fr", "pos", "stockInsufficient")).toContain("Stock insuffisant");
    expect(message("en", "pos", "stockInsufficient")).toContain("Insufficient stock");
    expect(message("fr", "pos", "wholeQuantityRequired")).toContain("entière");
    expect(message("en", "pos", "wholeQuantityRequired")).toContain("whole");
  });
});
