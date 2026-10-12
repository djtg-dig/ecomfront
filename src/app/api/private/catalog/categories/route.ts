import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { privateFailure, privateJson } from "@/lib/api/private-route";

export async function GET(request: Request) {
  try { const result = await authenticatedBackendRequest<unknown>("/api/v1/product-categories/", readPrivateSession(request)); return privateJson(result, { categories: result.data }); }
  catch (error) { return privateFailure(error); }
}
