import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GlobalError from "@/app/global-error";

describe("page d’erreur globale", () => {
  it("se rend sans LocaleProvider", () => {
    const markup = renderToStaticMarkup(<GlobalError error={new Error("test")} reset={() => undefined} />);
    expect(markup).toContain("Une erreur est survenue");
    expect(markup).toContain("<html");
  });

  it("reste indépendante des composants qui exigent le contexte de locale", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/global-error.tsx"), "utf8");

    expect(source).not.toContain("useLocale");
    expect(source).not.toContain("LocaleProvider");
    expect(source).not.toContain("ErrorContent");
    expect(source).not.toContain("LocaleBoundary");
  });
});
