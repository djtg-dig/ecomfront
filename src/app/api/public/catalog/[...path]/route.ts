import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, BackendNetworkError, backendClient } from "@/lib/api/backend-client";

export async function GET(request: NextRequest, context: RouteContext<"/api/public/catalog/[...path]">) {
  const { path } = await context.params;
  const allowed = new Set(["products/home", "products/search", "products/suggestions"]);
  const joined = path.join("/");
  const dynamicAllowed = /^products\/[A-Z0-9]{12}$/.test(joined) || /^categories\/[a-z0-9-]+$/.test(joined) || /^businesses\/[A-Z0-9]{12}$/.test(joined);
  if (!allowed.has(joined) && !dynamicAllowed) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const data = await backendClient.request(`/api/v1/public/${joined}/`, { query });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch (error) {
    if (error instanceof BackendApiError) return NextResponse.json({ detail: error.detail }, { status: error.status });
    if (error instanceof BackendNetworkError) return NextResponse.json({ detail: error.message }, { status: 503 });
    return NextResponse.json({ detail: "Service indisponible." }, { status: 503 });
  }
}
