import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/contact");

export default function ContactPage() {
  return (
    <section className="site-container py-16 sm:py-20">
        <p className="eyebrow">CONTACT</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--brand-secondary)] sm:text-5xl">Contact</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Les modalités de contact seront publiées après validation. Aucun moyen de contact public n&apos;est encore affiché.
        </p>
    </section>
  );
}
