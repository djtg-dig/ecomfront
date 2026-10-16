import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/auth/private-session-guard.tsx"), "utf8");

describe("garde de session privée", () => {
  it("préserve le segment enfant pendant la vérification de session", () => {
    expect(source).toContain('aria-hidden="true" className="hidden">{children}</div>');
    expect(source).toContain("Vérification de la session…");
    expect(source).toContain('router.replace("/connexion?erreur=session_expired")');
  });
});
