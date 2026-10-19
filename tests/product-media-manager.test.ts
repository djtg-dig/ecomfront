import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/catalog/product-media-manager.tsx"), "utf8");
const sessionSource = readFileSync(resolve(process.cwd(), "src/lib/auth/private-session.ts"), "utf8");

describe("gestionnaire de médias produit", () => {
  it("affiche le détail JSON de l’API et libère l’interface après un échec", () => {
    expect(source).toContain("payload.detail ?? \"Un téléversement a échoué.\"");
    expect(source).toContain("catch (reason)");
    expect(source).toContain("finally { setBusy(false);");
  });

  it("ne modifie pas la galerie avant un upload réussi", () => {
    expect(source).toContain("if (!response.ok) throw new Error");
    expect(source).toContain("await load();");
  });

  it("préserve les codes de stockage retournés par Django à travers le BFF", () => {
    expect(sessionSource).toContain('"media_storage_permission_denied"');
    expect(sessionSource).toContain('"media_storage_unavailable"');
    expect(sessionSource).toContain("error.status as 502 | 503");
  });
});
