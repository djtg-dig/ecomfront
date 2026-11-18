import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import AuthenticationUnavailablePage from "@/app/(auth)/auth/indisponible/page";
import { LocaleProvider } from "@/components/i18n/locale-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("retour=%2Fespace%2Fentreprises"),
}));

describe("page d’indisponibilité de Carri Account", () => {
  it("affiche une explication sûre et recommence via le BFF", () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider initialLocale="fr"><AuthenticationUnavailablePage /></LocaleProvider>,
    );

    expect(markup).toContain("Service de connexion temporairement indisponible");
    expect(markup).toContain("Nous ne parvenons pas à vous connecter pour le moment.");
    expect(markup).toContain("Veuillez réessayer dans quelques instants.");
    expect(markup).toContain("Réessayer la connexion");
    expect(markup).toContain('href="/api/auth/carri/login?retour=%2Fespace%2Fentreprises"');
    expect(markup).toContain('href="/"');
    expect(markup).not.toContain("delivery_binding");
    expect(markup).not.toContain("access_token");
    expect(markup).not.toContain("refresh_token");
  });
});
