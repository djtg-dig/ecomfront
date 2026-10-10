import "server-only";

type ServerConfig = {
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
  return {
    backendUrl: required("DJANGO_BACKEND_URL").replace(/\/$/, ""),
    frontendUrl: required("NEXT_PUBLIC_FRONTEND_URL").replace(/\/$/, ""),
    hmacClientId: required("ECOMMERCE_HMAC_CLIENT_ID"),
    hmacSecret: required("ECOMMERCE_HMAC_SECRET"),
  };
}
