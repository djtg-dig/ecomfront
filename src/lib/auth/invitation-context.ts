import "server-only";

import { decryptProtectedPayload, encryptProtectedPayload, sessionCookieOptions } from "@/lib/auth/session";

export const invitationContextCookieName = "ecommerce_invitation_context";
export const invitationReturnCookieName = "ecommerce_invitation_return";
const invitationContextTtl = 600;

export type InvitationContext = { invitationId: string; token: string };

export function readInvitationContext(value: string | null): InvitationContext | null {
  if (!value) return null;
  const context = decryptProtectedPayload(value) as Partial<InvitationContext> | null;
  if (!context || !/^[A-Za-z0-9_-]{1,64}$/.test(context.invitationId ?? "") ||
      !/^[A-Za-z0-9_-]{20,255}$/.test(context.token ?? "")) return null;
  return context as InvitationContext;
}

export function invitationContextCookie(context: InvitationContext) {
  return { ...sessionCookieOptions(invitationContextTtl), value: encryptProtectedPayload(context) };
}

export function clearInvitationContextCookie() {
  return { ...sessionCookieOptions(0), value: "" };
}
