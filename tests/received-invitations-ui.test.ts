import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/members/received-invitations.tsx"), "utf8");

describe("invitations reçues", () => {
  it("affiche les informations attendues et les deux décisions", () => {
    expect(source).toContain("business_name");
    expect(source).toContain("Permissions proposées");
    expect(source).toContain("Accepter");
    expect(source).toContain("Refuser");
  });

  it("protège les doubles soumissions et actualise après succès", () => {
    expect(source).toContain("if (pending) return");
    expect(source).toContain("await load()");
    expect(source).toContain("router.refresh()");
  });
});
