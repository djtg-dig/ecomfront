import "server-only";

export const sessionCookieName = "ecommerce_session";

export type EcommerceSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
