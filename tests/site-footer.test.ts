import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("variantes du pied de page", () => {
  it("distingue explicitement le footer public du footer privé compact", () => {
    const footer = source("src/components/layout/site-footer.tsx");

    expect(footer).toContain('variant: "public" | "private"');
    expect(footer).toContain('if (variant === "private")');
    expect(footer).toContain("site-footer-private");
    expect(footer).toContain("site-footer-public");
    expect(footer).toContain("Nos plateformes");
    expect(footer).toContain("Conditions générales");
    expect(footer).toContain("Confidentialité");
  });
});
