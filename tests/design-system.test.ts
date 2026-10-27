import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("design system privé", () => {
  it("définit le thème clair définitif et des états partagés", () => {
    const css = source("src/app/globals.css");
    const layout = source("src/app/layout.tsx");
    expect(css).not.toContain(':root[data-theme="dark"]');
    expect(css).not.toContain("prefers-color-scheme: dark");
    expect(css).toContain("color-scheme: light");
    expect(layout).toContain('data-theme="light"');
    expect(css).toContain("--brand: #2563eb");
    expect(css).toContain("--brand-hover: #1d4ed8");
    expect(css).toContain("--surface: #f8fafc");
    expect(css).toContain("--surface-raised: #ffffff");
    expect(css).toContain("--surface-muted");
    expect(css).toContain(".status-badge");
    expect(css).toContain(".empty-state");
    expect(css).toContain(".skeleton");
  });

  it("associe des icônes décoratives aux libellés de navigation", () => {
    const navigation = source("src/components/private/private-navigation.tsx");
    const css = source("src/app/globals.css");
    expect(navigation).toContain('from "lucide-react"');
    expect(navigation).toContain('aria-hidden="true" size={18}');
    expect(navigation).toContain("aria-label={open ?");
    expect(css).toContain('grid-template-columns: 24px minmax(0, 1fr)');
  });

  it("présente les modules accessibles sous forme de cartes sans assouplir les permissions", () => {
    const dashboard = source("src/components/businesses/business-manager.tsx");
    expect(dashboard).toContain("requiresAll ? link.permissions.every");
    expect(dashboard).toContain("app-card-interactive");
    expect(dashboard).toContain("const Icon = link.icon");
  });
});
