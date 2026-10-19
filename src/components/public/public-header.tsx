import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { readEcommerceSession } from "@/lib/auth/session";

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/contact", label: "Contact" },
];

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
        <nav className="w-full sm:w-auto" aria-label="Navigation principale">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:justify-end">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link className="nav-link" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              {isAuthenticated ? (
                <><Link className="nav-link" href="/espace">Mon espace</Link><LogoutButton /></>
              ) : (
                <Link className="button button-primary" href="/connexion">
                  Connexion
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
