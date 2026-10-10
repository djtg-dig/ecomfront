import "server-only";

import { getServerConfig } from "@/lib/config/server";

export class BackendApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BackendApiError";
  }
}

export async function backendRequest(path: string, init: RequestInit = {}) {
  const { backendUrl } = getServerConfig();
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new BackendApiError("La requête vers le service E-commerce a échoué.", response.status);
  }

  return response;
}
