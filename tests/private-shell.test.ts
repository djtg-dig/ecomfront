import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("shell de l’espace privé", () => {
  it("garde le shell, la navigation Next et la déconnexion dans le layout privé", () => {
    const layout = source("src/app/(private)/layout.tsx");
    const shell = source("src/components/private/private-shell.tsx");

    expect(layout).toContain("<PrivateShell>");
    expect(layout).toContain("<PrivateSessionGuard>{children}</PrivateSessionGuard>");
    expect(layout).not.toContain("readEcommerceSession");
    expect(shell).toContain('import Link from "next/link"');
    expect(shell).toContain("usePathname");
    expect(shell).toContain("<LogoutButton />");
    expect(shell).toContain('aria-label="Navigation privée"');
    expect(shell).toContain('aria-current={isActive(pathname, item.href) ? "page" : undefined}');
    expect(source("src/app/(private)/espace/loading.tsx")).not.toContain("min-h-screen");
  });

  it("redirige après une déconnexion réussie sans rafraîchir le layout privé", () => {
    const logout = source("src/components/auth/logout-button.tsx");

    expect(logout).toContain('method: "POST"');
    expect(logout).toContain('headers: { "x-csrf-protection": "1" }');
    expect(logout).toContain('router.replace("/")');
    expect(logout).not.toContain("router.refresh()");
  });
});
