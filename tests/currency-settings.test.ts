import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/businesses/currency-settings.tsx"), "utf8");

function handler(name: "addCurrency" | "addRate") {
  const start = source.indexOf(`async function ${name}`);
  const end = source.indexOf("\n  async function", start + 1);
  return source.slice(start, end === -1 ? undefined : end);
}

describe("formulaires de devises", () => {
  it.each(["addCurrency", "addRate"] as const)("capture le formulaire avant await dans %s", (name) => {
    const code = handler(name);
    expect(code).toContain("const formElement = event.currentTarget;");
    expect(code.indexOf("const formElement = event.currentTarget;")).toBeLessThan(code.indexOf("await fetch"));
    expect(code).not.toMatch(/await[\s\S]*event\.currentTarget\.reset\(\)/);
  });

  it.each(["addCurrency", "addRate"] as const)("préserve les valeurs en cas d’échec et libère saving dans %s", (name) => {
    const code = handler(name);
    expect(code).toContain("if (!response.ok) { setError(await problem(response)); return; }");
    expect(code).toContain("} finally {");
    expect(code).toContain("setSaving(false);");
    expect(code.indexOf("formElement.reset();")).toBeGreaterThan(code.indexOf("if (!response.ok)"));
  });

  it("met à jour l’interface immédiatement puis la rafraîchit sans second POST", () => {
    expect(handler("addCurrency")).toContain("setEntries((current)");
    expect(handler("addRate")).toContain("setRates((current)");
    expect(source.match(/method: "POST"/g)).toHaveLength(2);
    expect(source).toContain("void load();");
  });
});
