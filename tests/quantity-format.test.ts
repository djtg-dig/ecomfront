import { describe, expect, it } from "vitest";

import { formatQuantity } from "@/lib/quantities/format";

describe("formatQuantity", () => {
  it("removes fixed decimal padding for indivisible quantities", () => {
    expect(formatQuantity("1.000", "fr", false)).toBe("1");
    expect(formatQuantity("2.000", "en", false)).toBe("2");
    expect(formatQuantity("1000.000", "fr", false)).toBe("1 000");
  });

  it("keeps meaningful decimal places using the active locale", () => {
    expect(formatQuantity("0.500", "fr", true)).toBe("0,5");
    expect(formatQuantity("1.250", "fr", true)).toBe("1,25");
    expect(formatQuantity("1.000", "fr", true)).toBe("1");
    expect(formatQuantity("2.750", "en", true)).toBe("2.75");
  });

  it("does not silently round invalid values", () => {
    expect(formatQuantity("1.500", "fr", false)).toBe("1.500");
    expect(formatQuantity("1.2345", "fr", true)).toBe("1.2345");
  });
});
