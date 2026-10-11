import { describe, expect, it, vi } from "vitest";

import { coordinateRefresh } from "@/lib/auth/refresh";
import type { EcommerceSession } from "@/lib/auth/session";

const rotatedSession: EcommerceSession = {
  accessToken: "rotated-access",
  refreshToken: "rotated-refresh",
  accessExpiresAt: Date.now() + 60_000,
  refreshExpiresAt: Date.now() + 86_400_000,
};

describe("coordination du refresh JWT", () => {
  it("exécute une seule rotation et partage le résultat entre requêtes concurrentes", async () => {
    const operation = vi.fn(async () => rotatedSession);
    const requests = Array.from({ length: 12 }, () =>
      coordinateRefresh("old-refresh-concurrent-case", operation),
    );

    await expect(Promise.all(requests)).resolves.toEqual(
      Array.from({ length: 12 }, () => rotatedSession),
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("réutilise le résultat rotaté pour un cookie ancien arrivé juste après", async () => {
    const operation = vi.fn(async () => rotatedSession);
    const first = await coordinateRefresh("old-refresh-delayed-case", operation);
    const second = await coordinateRefresh("old-refresh-delayed-case", operation);

    expect(first).toBe(rotatedSession);
    expect(second).toBe(rotatedSession);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});