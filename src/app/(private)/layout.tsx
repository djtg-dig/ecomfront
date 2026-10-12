import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noIndexRobots } from "@/lib/seo/site";
import { PrivateSessionGuard } from "@/components/auth/private-session-guard";
import { PrivateShell } from "@/components/private/private-shell";

// Future authenticated application routes belong to this group.
export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function PrivateLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PrivateShell>
      <PrivateSessionGuard>{children}</PrivateSessionGuard>
    </PrivateShell>
  );
}
