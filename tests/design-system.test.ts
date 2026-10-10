import { describe, expect, it } from "vitest";

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  if (!channels || channels.length !== 3) {
    throw new Error(`Couleur hexadécimale invalide : ${hex}`);
  }

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);

  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

describe("Design System Carri Business", () => {
  it("garantit le niveau AA pour les paires textuelles prévues", () => {
    const white = "#ffffff";

    expect(contrastRatio("#1d71b8", white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#155b96", white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#023967", white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#04111f", "#f39200")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#4b5d70", "#f4f8fc")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#04111f", "#dbe5ee")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#087f5b", white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#b42318", white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#9a6700", white)).toBeGreaterThanOrEqual(4.5);
  });

  it("interdit le texte blanc sur l'orange historique", () => {
    expect(contrastRatio("#f39200", "#ffffff")).toBeLessThan(4.5);
  });
});
