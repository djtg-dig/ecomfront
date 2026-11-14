import { privateFailure, privateJson } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

/** Le référentiel public reste servi par le BFF afin de ne pas exposer sa configuration au navigateur. */
export async function GET(request: Request) {
  try {
    const result = await authenticatedBackendRequest<unknown>("/api/v1/countries/", readPrivateSession(request));
    return privateJson(result, { countries: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}
