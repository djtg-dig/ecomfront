import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { getPublicSiteUrl, isPublicIndexingEnabled, noIndexRobots } from "@/lib/seo/site";
import { LocaleBoundary } from "@/components/i18n/locale-boundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Proxy initialise ecommerce_locale from Accept-Language before this document
// is returned. Apply it before hydration so the DOM language is correct even
// though the Cache Components-compatible RootLayout stays static.
const localeBootstrapScript = `(() => { const match = document.cookie.match(/(?:^|; )ecommerce_locale=(fr|en)(?:;|$)/); if (match) document.documentElement.lang = match[1]; })();`;

export const metadata: Metadata = {
  metadataBase: getPublicSiteUrl(),
  title: {
    default: "E-commerce",
    template: "%s | E-commerce",
  },
  description: "Portail de gestion commerciale E-commerce.",
  robots: isPublicIndexingEnabled() ? { index: true, follow: true } : noIndexRobots,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "E-commerce",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="locale-html-language" strategy="beforeInteractive">{localeBootstrapScript}</Script>
        <Suspense fallback={<div aria-busy="true" className="min-h-screen" />}>
          <LocaleBoundary>{children}</LocaleBoundary>
        </Suspense>
      </body>
    </html>
  );
}
