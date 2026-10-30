import { redirect } from "next/navigation";

const allowedParameters = new Set(["search", "business", "status", "page"]);

export default async function LegacyCartsPage({ searchParams }: PageProps<"/paniers">) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (!allowedParameters.has(key) || typeof value !== "string") continue;
    query.set(key, value);
  }
  redirect(`/compte/paniers${query.size ? `?${query}` : ""}`);
}
