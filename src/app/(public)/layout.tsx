import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="page-shell flex min-h-screen flex-col"><PublicHeader /><main className="flex-1">{children}</main><SiteFooter /></div>;
}
