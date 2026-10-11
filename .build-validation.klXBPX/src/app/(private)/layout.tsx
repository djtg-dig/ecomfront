import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { noIndexRobots } from "@/lib/seo/site";
import { readEcommerceSession } from "@/lib/auth/session";
import { PrivateSessionGuard } from "@/components/auth/private-session-guard";

// Future authenticated application routes belong to this group.
export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default async function PrivateLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await readEcommerceSession();
  if (!session) {
    redirect("/connexion?erreur=session_expired");
  }

  return <PrivateSessionGuard>{children}</PrivateSessionGuard>;
}
