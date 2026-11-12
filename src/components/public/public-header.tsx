import Link from "next/link";
import { readEcommerceSession } from "@/lib/auth/session";
import { MarketplaceSearch } from "@/components/public/marketplace";
import { PublicNavigation } from "@/components/public/public-navigation";

export async function PublicHeader() {
  const isAuthenticated = Boolean(await readEcommerceSession());
  return <header className="site-header"><div className="site-container grid min-h-16 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 py-3 lg:grid-cols-[auto_minmax(20rem,1fr)_auto]"><Link aria-label="Carri Business — accueil" className="brand-lockup" href="/"><span className="brand-wordmark"><span>Carri</span> Business</span></Link><div className="order-3 col-span-2 w-full lg:order-none lg:col-span-1"><MarketplaceSearch /></div><PublicNavigation isAuthenticated={isAuthenticated} /></div></header>;
}
