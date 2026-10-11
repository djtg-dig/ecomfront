import "server-only";

export type ServerConfig = {
  backendUrl: string;
  frontendUrl: string;
  hmacClientId: string;
  hmacSecret: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable serveur ${name} est requise.`);
  }
  return value;
}

export function getServerConfig(): ServerConfig {
  const backendUrl = new URL(required("DJANGO_BACKEND_URL").replace(/\/$/, ""));
  const frontendUrl = new URL(required("NEXT_PUBLIC_FRONTEND_URL").replace(/\/$/, ""));
  if (!new Set(["http:", "https:"]).has(backendUrl.protocol) ||
      !new Set(["http:", "https:"]).has(frontendUrl.protocol) ||
      backendUrl.username || backendUrl.password || frontendUrl.username || frontendUrl.password) {
    throw new Error("Les URL serveur et frontend doivent utiliser HTTP(S) sans identifiants.");
  }

  return {
    backendUrl: backendUrl.origin,
    frontendUrl: frontendUrl.origin,
    hmacClientId: required("ECOMMERCE_HMAC_CLIENT_ID"),
    hmacSecret: required("ECOMMERCE_HMAC_SECRET"),
  };
}
