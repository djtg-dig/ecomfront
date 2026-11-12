"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

export function UserAvatar({ avatarUrl, subject, size = "md" }: Readonly<{ avatarUrl?: string | null; subject?: string; size?: "sm" | "md" | "lg" }>) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = (subject || "?").trim().slice(0, 2).toUpperCase();
  const dimensions = size === "lg" ? "size-20 text-xl" : size === "sm" ? "size-8 text-xs" : "size-10 text-sm";
  if (avatarUrl && !imageFailed) return <img alt="" className={`${dimensions} rounded-full object-cover ring-1 ring-[var(--line)]`} onError={() => setImageFailed(true)} src={avatarUrl} />;
  return <span aria-label="Avatar utilisateur" className={`${dimensions} grid place-items-center rounded-full bg-[var(--surface-muted)] font-semibold text-[var(--brand)] ring-1 ring-[var(--line)]`}>{subject ? initials : <UserRound aria-hidden="true" size={size === "lg" ? 30 : 18} />}</span>;
}
