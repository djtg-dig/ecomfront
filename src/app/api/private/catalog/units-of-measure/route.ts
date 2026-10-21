import { privateFailure, privateJson } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

export async function GET(request: Request) {
  try {
    const result = await authenticatedBackendRequest<unknown>("/api/v1/units-of-measure/", readPrivateSession(request));
    return privateJson(result, { units: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}
