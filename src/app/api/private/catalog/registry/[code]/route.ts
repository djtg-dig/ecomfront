import { invalidIdentifier, privateFailure, privateJson, validPrivateIdentifier } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    if (!validPrivateIdentifier(code)) return invalidIdentifier("Code de catégorie invalide.");
    const result = await authenticatedBackendRequest<unknown>(
      `/api/v1/product-categories/registry/${code}/`,
      readPrivateSession(request),
    );
    return privateJson(result, { category: result.data });
  } catch (error) {
    return privateFailure(error);
  }
}
