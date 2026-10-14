"use client";

import { useEffect, useState } from "react";

import { authenticationErrors } from "@/lib/auth/login-errors";

export function ConnectionStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const sync = () => setIsOffline(!navigator.onLine);
    sync();
    window.addEventListener("offline", sync);
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("offline", sync);
      window.removeEventListener("online", sync);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <p className="mt-6 rounded-md border border-[var(--error)]/30 bg-white p-3 text-sm text-[var(--error)]" role="alert">
      {authenticationErrors.internet_interrupted}
    </p>
  );
}
