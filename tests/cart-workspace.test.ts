import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { messages } from "@/lib/i18n/messages";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("espace personnel des paniers", () => {
  it("place les paniers dans la navigation personnelle, pas dans les modules entreprise", () => {
    const shell = source("src/components/private/private-shell.tsx");
    expect(shell).toContain('href: "/compte/paniers"');
    expect(shell).toContain('label: t("navigation", "carts")');
    expect(shell.indexOf('href: "/compte/paniers"')).toBeLessThan(shell.indexOf("function BusinessShell"));
  });

  it("préserve une redirection sûre depuis la route historique", () => {
    const legacy = source("src/app/(public)/paniers/page.tsx");
    expect(legacy).toContain('new Set(["search", "business", "status", "page"])');
    expect(legacy).toContain("redirect(`/compte/paniers");
  });

  it("utilise un seul BFF carts pour la liste, le détail et les mutations", () => {
    const manager = source("src/components/carts/cart-manager.tsx");
    expect(manager).toContain('fetch(`/api/private/carts/${path}`');
    expect(manager).toContain('method: "PATCH"');
    expect(manager).toContain('method: "DELETE"');
    expect(manager).toContain('method: "POST", body: JSON.stringify({ source_cart: cart.reference');
    expect(manager).toContain('failure.code === "CART_LOCKED"');
    expect(manager).toContain('status=DRAFT&page_size=100');
  });

  it("fournit les libellés FR et EN nécessaires", () => {
    expect(messages.fr.navigation.carts).toBe("Mes paniers");
    expect(messages.en.navigation.carts).toBe("My carts");
    expect(messages.fr.carts.locked).toBe("Panier verrouillé");
    expect(messages.en.carts.transfer).toBe("Transfer");
    expect(messages.fr.carts.memberCannotPurchaseTitle).toBe("Vous faites partie de cette boutique");
    expect(messages.en.carts.memberCannotPurchaseTitle).toBe("You are a member of this store");
    expect(messages.fr.carts.memberCannotPurchaseDescription).toContain("consulter les produits");
    expect(messages.en.carts.memberCannotPurchaseDescription).toContain("browse its products");
  });

  it("relie un ajout marketplace au panier réellement retourné par Django", () => {
    const addToCart = source("src/components/carts/marketplace-add-to-cart.tsx");
    const productPage = source("src/components/public/product-page.tsx");
    expect(addToCart).toContain('method: "POST", body: JSON.stringify({ product, quantity: normalizedQuantity })');
    expect(addToCart).toContain('`${encodeURIComponent(selected)}/items`');
    expect(addToCart).toContain("setModalError(readableError(error))");
    expect(addToCart).toContain("validateCartQuantity(quantity, rules)");
    expect(addToCart).toContain("setCartReference(added.reference ?? \"\")");
    expect(addToCart).toContain("setCartReference(result.reference ?? selected)");
    expect(addToCart).toContain("/compte/paniers/${encodeURIComponent(cartReference)}");
    expect(addToCart).toContain('fetchBusinesses()');
    expect(addToCart).toContain('memberCannotPurchase');
    expect(addToCart).toContain('error.code === "BUSINESS_MEMBER_CANNOT_PURCHASE"');
    expect(addToCart).toContain('t("carts", "memberCannotPurchaseTitle")');
    expect(addToCart).toContain('t("carts", "memberCannotPurchaseDescription")');
    expect(addToCart).toContain('else setMessage(readableError(error))');
    expect(addToCart).toContain('if (!isOnlinePurchasable) return');
    expect(addToCart).toContain('t("carts", "productUnavailable")');
    expect(productPage).toContain('isOnlinePurchasable={product.is_online_purchasable}');
  });

  it("retire la recherche redondante du contenu de la fiche produit", () => {
    const productPage = source("src/components/public/product-page.tsx");
    expect(productPage).not.toContain("MarketplaceSearch");
  });

  it("actualise le détail après un refus d’achat lié à une adhésion active", () => {
    const manager = source("src/components/carts/cart-manager.tsx");
    expect(manager).toContain('failure.code === "BUSINESS_MEMBER_CANNOT_PURCHASE"');
    expect(manager).toContain("setMembershipForbidden(true)");
    expect(manager).toContain('payload.code === "BUSINESS_MEMBER_CANNOT_PURCHASE" ? undefined : payload.detail');
    expect(source("src/lib/businesses/list-client.ts")).toContain('cache: "no-store"');
  });
});
