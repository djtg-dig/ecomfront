import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n/messages";

const source = readFileSync(resolve(process.cwd(), "src/components/auth/home-authentication-action.tsx"), "utf8");

describe("CTA d’authentification de l’accueil", () => {
  it("vérifie une fois la session avant d’afficher une action", () => {
    expect(source).toContain('useState<SessionState>("checking")');
    expect(source).toContain('fetch("/api/auth/refresh"');
    expect(source).toContain("}, []);");
    expect(source).toContain('t("home", "checking")');
    expect(messages.fr.home.checking).toBe("Vérification de la session…");
    expect(messages.en.home.checking).toBe("Checking your session…");
  });

  it("dirige une session vérifiée vers l’espace et une session absente vers OAuth", () => {
    expect(source).toContain('href="/espace">{t("home", "openWorkspace")}');
    expect(source).toContain('href="/api/auth/carri/login">{t("home", "signInCarri")}');
    expect(messages.fr.home.openWorkspace).toBe("Accéder à mon espace");
    expect(messages.en.home.signInCarri).toBe("Sign in with Carri Account");
  });
});
