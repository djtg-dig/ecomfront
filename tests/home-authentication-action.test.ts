import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/auth/home-authentication-action.tsx"), "utf8");

describe("CTA d’authentification de l’accueil", () => {
  it("vérifie une fois la session avant d’afficher une action", () => {
    expect(source).toContain('useState<SessionState>("checking")');
    expect(source).toContain('fetch("/api/auth/refresh"');
    expect(source).toContain("}, []);");
    expect(source).toContain("Vérification de la session…");
  });

  it("dirige une session vérifiée vers l’espace et une session absente vers OAuth", () => {
    expect(source).toContain('href="/espace">Accéder à mon espace');
    expect(source).toContain('href="/api/auth/carri/login">Se connecter avec Carri Account');
  });
});
