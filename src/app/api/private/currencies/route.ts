import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { privateFailure, privateJson } from "@/lib/api/private-route";

export async function GET(request: Request) {
  try {
    const result = await authenticatedBackendRequest<unknown>("/api/v1/currencies/", readPrivateSession(request));
    return privateJson(result, { currencies: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}
