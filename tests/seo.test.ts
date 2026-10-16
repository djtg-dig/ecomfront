import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata as privateMetadata } from "@/app/(private)/layout";
import {
  createPublicMetadata,
  getPublicSiteUrl,
  isPublicIndexingEnabled,
  noIndexRobots,
} from "@/lib/seo/site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SEO public", () => {
  it("applique noindex, nofollow à toutes les pages du groupe privé", () => {
    expect(privateMetadata.robots).toEqual(noIndexRobots);
    expect(sitemap().some((entry) => entry.url.includes("/espace"))).toBe(false);
  });

  it("produit des metadata françaises avec canonical et Open Graph absolus", () => {
    vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", "https://boutique.exemple.test");
    vi.stubEnv("SEO_ALLOW_INDEXING", "false");

    const metadata = createPublicMetadata("/fonctionnalites");

    expect(getPublicSiteUrl().toString()).toBe("https://boutique.exemple.test/");
    expect(metadata.alternates?.canonical).toBe("https://boutique.exemple.test/fonctionnalites");
    expect(metadata.openGraph).toMatchObject({
      locale: "fr_FR",
      url: "https://boutique.exemple.test/fonctionnalites",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary" });
    expect(metadata.robots).toEqual(noIndexRobots);
  });

  it("refuse l'indexation sans activation explicite de production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", "https://boutique.exemple.test");
    vi.stubEnv("SEO_ALLOW_INDEXING", "true");

    expect(isPublicIndexingEnabled()).toBe(false);
    expect(robots()).toMatchObject({ rules: { userAgent: "*", disallow: "/" } });
    expect(sitemap()).toEqual([]);
  });

  it("n'expose que les pages publiques dans le sitemap activé", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_FRONTEND_URL", "https://boutique.exemple.test");
    vi.stubEnv("SEO_ALLOW_INDEXING", "true");

    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://boutique.exemple.test/",
      "https://boutique.exemple.test/fonctionnalites",
      "https://boutique.exemple.test/tarifs",
      "https://boutique.exemple.test/contact",
    ]);
    expect(sitemap().some((entry) => entry.url.includes("connexion"))).toBe(false);
    expect(robots()).toMatchObject({
      rules: {
        disallow: expect.arrayContaining(["/connexion/", "/api/", "/auth/callback/"]),
      },
    });
  });
});
