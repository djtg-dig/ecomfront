import Link from "next/link";
import { readEcommerceSession } from "@/lib/auth/session";
import { PublicNavigation } from "@/components/public/public-navigation";

export async function PublicHeader() {
  const isAuthenticated = Boolean(await readEcommerceSession());

  return (
    <header className="site-header">
      <div className="site-container flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
        <Link aria-label="Retour à l’accueil" className="brand-lockup flex items-center gap-3 font-semibold" href="/">
          <span className="brand-mark grid size-8 place-items-center text-sm font-bold">
            E
          </span>
          E-commerce
        </Link>
        <PublicNavigation isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
}
