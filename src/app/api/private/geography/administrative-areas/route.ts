import { invalidIdentifier, privateFailure, privateJson } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

export async function GET(request: Request) {
  const countryId = new URL(request.url).searchParams.get("country_id") ?? "";
  if (!/^\d+$/.test(countryId)) return invalidIdentifier("Identifiant de pays invalide.");
  try {
    const result = await authenticatedBackendRequest<unknown>(
      "/api/v1/administrative-areas/",
      readPrivateSession(request),
      { query: { country_id: countryId } },
    );
    return privateJson(result, { administrative_areas: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}
