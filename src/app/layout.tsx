import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { getPublicSiteUrl, isPublicIndexingEnabled, noIndexRobots } from "@/lib/seo/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
