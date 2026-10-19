"use client";

export type ListedBusiness = {
  public_id: string;
  name: string;
  primary_currency: string;
  status: string;
};

export class BusinessListRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "BusinessListRequestError";
  }
}

let inFlightRequest: Promise<ListedBusiness[]> | null = null;

async function readDetail(response: Response) {
  try {
    const payload = await response.json() as { detail?: string };
    return payload.detail ?? "Le service E-commerce est indisponible.";
  } catch {
    return "Le service E-commerce est indisponible.";
  }
}

/**
 * Shares only a request that is currently pending.  Results are deliberately
 * not cached: a retry and a later navigation always read fresh permissions.
 */
export function fetchBusinesses(): Promise<ListedBusiness[]> {
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    const response = await fetch("/api/private/businesses", {
      credentials: "same-origin",
    });
    if (!response.ok) throw new BusinessListRequestError(response.status, await readDetail(response));
    return (await response.json() as { businesses: ListedBusiness[] }).businesses;
  })();

  const request = inFlightRequest;
  void request.then(
    () => { if (inFlightRequest === request) inFlightRequest = null; },
    () => { if (inFlightRequest === request) inFlightRequest = null; },
  );
  return request;
}
