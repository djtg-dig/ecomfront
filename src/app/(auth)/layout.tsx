import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noIndexRobots } from "@/lib/seo/site";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
