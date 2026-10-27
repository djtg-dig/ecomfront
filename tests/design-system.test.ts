import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("design system privé", () => {
  it("définit des tokens clairs et sombres ainsi que des états partagés", () => {
    const css = source("src/app/globals.css");
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("--surface-muted");
    expect(css).toContain(".status-badge");
    expect(css).toContain(".empty-state");
    expect(css).toContain(".skeleton");
  });

  it("associe des icônes décoratives aux libellés de navigation", () => {
    const shell = source("src/components/private/private-shell.tsx");
    expect(shell).toContain('from "lucide-react"');
    expect(shell).toContain('aria-hidden="true" size={18}');
    expect(shell).toContain("aria-label={open ?");
  });

  it("présente les modules accessibles sous forme de cartes sans assouplir les permissions", () => {
    const dashboard = source("src/components/businesses/business-manager.tsx");
    expect(dashboard).toContain("requiresAll ? link.permissions.every");
    expect(dashboard).toContain("app-card-interactive");
    expect(dashboard).toContain("const Icon = link.icon");
  });
});
