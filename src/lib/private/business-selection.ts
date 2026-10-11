import "server-only";

import { requestCookie } from "@/lib/auth/security";

export const selectedBusinessCookieName = "ecommerce_selected_business";

export function selectedBusinessFromRequest(request: Request): string | null {
  const value = requestCookie(request, selectedBusinessCookieName);
  return value && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}
