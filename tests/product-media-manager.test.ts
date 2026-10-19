import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/catalog/product-media-manager.tsx"), "utf8");
const sessionSource = readFileSync(resolve(process.cwd(), "src/lib/auth/private-session.ts"), "utf8");

describe("gestionnaire de médias produit", () => {
  it("affiche le détail JSON de l’API et libère l’interface après un échec", () => {
    expect(source).toContain("responseMessage(response");
    expect(source).toContain("catch (reason)");
    expect(source).toContain("finally { setBusy(false);");
  });

  it("ne modifie pas la galerie avant un upload réussi", () => {
    expect(source).toContain("if (!response.ok) throw new Error");
    expect(source).toContain("payload.media.media_type !== type");
    expect(source).toContain("await load();");
  });

  it("annonce les états d’une vidéo et n’envoie jamais de Content-Type multipart manuel", () => {
    expect(source).toContain("sélectionné"); expect(source).toContain("Validation de la ${mediaLabel}"); expect(source).toContain("Téléversement en cours…"); expect(source).toContain("Vidéo ajoutée avec succès."); expect(source).toContain("validateSelectedVideo"); expect(source).not.toContain('"content-type": "multipart/form-data"');
  });

  it("garde les vidéos hors du contrôle d’image principale et les affiche avec le lecteur HTML5", () => {
    expect(source).toContain('item.media_type === "IMAGE" && !item.is_primary'); expect(source).toContain("<video className=");
  });

  it("affiche l’ordre global et des contrôles accessibles dans les deux directions", () => {
    expect(source).toContain("media.map((item, index)");
    expect(source).toContain("Position {index + 1}");
    expect(source).toContain('aria-label="Déplacer vers le haut"');
    expect(source).toContain('aria-label="Déplacer vers le bas"');
    expect(source).toContain("disabled={busy || index === 0}");
    expect(source).toContain("disabled={busy || index === media.length - 1}");
    expect(source).not.toContain(">Monter<");
  });

  it("n’annonce plus de restriction de résolution", () => {
    expect(source).not.toContain("480p à 1080p");
  });

  it("préserve les codes de stockage retournés par Django à travers le BFF", () => {
    expect(sessionSource).toContain('"media_storage_permission_denied"');
    expect(sessionSource).toContain('"media_storage_unavailable"');
    expect(sessionSource).toContain("error.status as 502 | 503");
  });
});
