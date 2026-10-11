import type { Metadata } from "next";

const LOCAL_SITE_URL = "http://localhost:3000";

export const publicPages = [
  {
    path: "/",
    title: "Gestion commerciale",
    description:
      "Portail E-commerce pour préparer la gestion des activités commerciales et des équipes.",
  },
  {
    path: "/fonctionnalites",
    title: "Fonctionnalités",
    description:
      "Fonctionnalités documentées de l'API E-commerce pour les entreprises, le catalogue et le suivi commercial.",
  },
  {
    path: "/tarifs",
    title: "Tarifs",
    description:
      "Informations tarifaires du portail E-commerce, à publier après validation métier.",
  },
  {
    path: "/contact",
    title: "Contact",
    description:
      "Informations de contact du portail E-commerce, à publier après validation.",
  },
] as const;

export type PublicPagePath = (typeof publicPages)[number]["path"];

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
    "max-image-preview": "none",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export function getPublicSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();

  try {
    return new URL(configuredUrl || LOCAL_SITE_URL);
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}

export function isPublicIndexingEnabled(): boolean {
  const siteUrl = getPublicSiteUrl();

  return (
    process.env.NODE_ENV === "production" &&
    process.env.SEO_ALLOW_INDEXING === "true" &&
    siteUrl.protocol === "https:" &&
    siteUrl.hostname !== "localhost" &&
    siteUrl.hostname !== "127.0.0.1"
  );
}

export function absoluteUrl(path: string): string {
  return new URL(path, getPublicSiteUrl()).toString();
}

export function getPublicPage(path: PublicPagePath) {
  const page = publicPages.find((candidate) => candidate.path === path);

  if (!page) {
    throw new Error(`Page publique SEO inconnue : ${path}`);
  }

  return page;
}

export function createPublicMetadata(path: PublicPagePath): Metadata {
  const page = getPublicPage(path);
  const url = absoluteUrl(path);

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: isPublicIndexingEnabled() ? { index: true, follow: true } : noIndexRobots,
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: "E-commerce",
      title: page.title,
      description: page.description,
      url,
    },
    twitter: {
      card: "summary",
      title: page.title,
      description: page.description,
    },
  };
}
