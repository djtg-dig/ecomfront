import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n/messages";

const source = readFileSync(resolve(process.cwd(), "src/components/auth/private-session-guard.tsx"), "utf8");
const sessionProvider = readFileSync(resolve(process.cwd(), "src/components/auth/auth-session-provider.tsx"), "utf8");

describe("garde de session privée", () => {
  it("préserve le segment privé pour la validation Instant Navigation pendant la vérification", () => {
    expect(source).toContain('aria-hidden="true" className="hidden">{children}</div>');
    expect(source).toContain("Instant Navigation validation");
    expect(source).toContain('t("feedback", "sessionChecking")');
    expect(messages.fr.feedback.sessionChecking).toBe("Vérification de la session…");
    expect(messages.en.feedback.sessionChecking).toBe("Checking your session…");
    expect(sessionProvider).toContain('cache: "no-store"');
    expect(sessionProvider).toContain("setVersion((current) => current + 1)");
    expect(sessionProvider).toContain('response.status === 401');
    expect(source).toContain("window.location.assign");
  });
});
