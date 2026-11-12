import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("menu public mobile", () => {
  const navigation = source("src/components/public/public-navigation.tsx");

  it("isole le défilement du panneau et le limite à la hauteur dynamique de l’écran", () => {
    expect(navigation).toContain("100dvh");
    expect(navigation).toContain("overflow-y-auto");
    expect(navigation).toContain("overscroll-contain");
    expect(navigation).toContain("safe-area-inset-bottom");
    expect(navigation).toContain('role="dialog"');
    expect(navigation).toContain('aria-modal="true"');
  });

  it("verrouille la page en conservant sa position puis restaure tous ses styles", () => {
    expect(navigation).toContain("const scrollPosition = window.scrollY");
    expect(navigation).toContain('document.body.style.position = "fixed"');
    expect(navigation).toContain('document.body.style.overflow = "hidden"');
    expect(navigation).toContain("Object.assign(document.body.style, previousStyles)");
    expect(navigation).toContain("window.scrollTo({ left: 0, top: scrollPosition, behavior: \"instant\" })");
  });

  it("se ferme au clavier, sur navigation et lors du passage au bureau", () => {
    expect(navigation).toContain('event.key === "Escape"');
    expect(navigation).toContain("usePathname");
    expect(navigation).toContain("}, [pathname]);");
    expect(navigation).toContain('window.matchMedia("(min-width: 1024px)")');
    expect(navigation).toContain("onClick={closeMenu}");
    expect(navigation).toContain("closeButtonRef.current?.focus({ preventScroll: true })");
  });
});
