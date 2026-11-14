import { invalidIdentifier, privateFailure, privateJson } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

export async function GET(request: Request) {
  const administrativeAreaId = new URL(request.url).searchParams.get("administrative_area_id") ?? "";
  if (!/^\d+$/.test(administrativeAreaId)) return invalidIdentifier("Identifiant de subdivision invalide.");
  try {
    const result = await authenticatedBackendRequest<unknown>(
      "/api/v1/localities/",
      readPrivateSession(request),
      { query: { administrative_area_id: administrativeAreaId } },
    );
    return privateJson(result, { localities: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}
