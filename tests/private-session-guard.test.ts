import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n/messages";

const source = readFileSync(resolve(process.cwd(), "src/components/auth/private-session-guard.tsx"), "utf8");

describe("garde de session privée", () => {
  it("ne monte pas les routes privées avant la vérification de session", () => {
    expect(source).not.toContain('aria-hidden="true" className="hidden">{children}</div>');
    expect(source).toContain('t("feedback", "sessionChecking")');
    expect(messages.fr.feedback.sessionChecking).toBe("Vérification de la session…");
    expect(messages.en.feedback.sessionChecking).toBe("Checking your session…");
    expect(source).toContain('router.replace("/connexion?erreur=session_expired")');
  });
});
