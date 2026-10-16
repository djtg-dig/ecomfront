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

  it("protège les doubles soumissions et redirige après une finalisation confirmée", () => {
    expect(source).toContain("if (pending) return");
    expect(source).toContain("let navigationScheduled = false");
    expect(source).toContain("body.redirect_to !== expectedDestination");
    expect(source).toContain("window.location.assign(destination)");
    expect(source).toContain("Statut :");
  });
});
