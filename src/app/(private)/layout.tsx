import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noIndexRobots } from "@/lib/seo/site";

// Future authenticated application routes belong to this group.
export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function PrivateLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
