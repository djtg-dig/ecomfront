import Link from "next/link";

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 sm:px-8">
        <Link className="flex items-center gap-3 font-semibold" href="/">
          <span className="grid size-8 place-items-center bg-[var(--brand)] text-sm font-bold text-white">
            E
          </span>
          E-commerce
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link className="hover:text-[var(--ink)]" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
