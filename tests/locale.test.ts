import { describe, expect, it } from "vitest";

import { fallbackLocale, isLocale, localeFromAcceptLanguage } from "@/lib/i18n/locale";
import { message, messages } from "@/lib/i18n/messages";

describe("résolution de la langue", () => {
  it("normalise les variantes régionales et respecte les priorités Accept-Language", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("sw-CD,fr-FR;q=0.8,en;q=0.7")).toBe("fr");
    expect(localeFromAcceptLanguage("pt-BR,ln;q=0.9")).toBe(fallbackLocale);
  });

  it("n'accepte que les locales publiées", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("sw")).toBe(false);
  });

  it("garde les clés de premier niveau synchronisées entre français et anglais", () => {
    expect(Object.keys(messages.fr)).toEqual(Object.keys(messages.en));
    for (const section of Object.keys(messages.fr) as Array<keyof typeof messages.fr>) {
      expect(Object.keys(messages.fr[section]).sort()).toEqual(Object.keys(messages.en[section]).sort());
    }
    expect(message("en", "navigation", "workspace")).toBe("My workspace");
  });

  it("décrit les photos produit sans imposer de dimensions", () => {
    const frenchHint = message("fr", "catalog", "imageHint");
    const englishHint = message("en", "catalog", "imageHint");

    expect(frenchHint).toContain("verticales");
    expect(englishHint).toContain("portrait");
    expect(frenchHint).not.toContain("800");
    expect(englishHint).not.toContain("800");
    expect(messages.fr.catalog.imageHint).toBe(frenchHint);
    expect(messages.en.catalog.imageHint).toBe(englishHint);
  });

  it("traduit les permissions de messagerie en français et en anglais", () => {
    expect(message("fr", "messagingPermissions", "group")).toBe("Messagerie");
    expect(message("en", "messagingPermissions", "group")).toBe("Messaging");
    expect(message("fr", "messagingPermissions", "replyLabel")).toBe("Répondre aux acheteurs");
    expect(message("en", "messagingPermissions", "replyLabel")).toBe("Reply to buyers");
    expect(message("en", "messagingPermissions", "manageDescription")).toContain("business messaging settings");
  });
});
