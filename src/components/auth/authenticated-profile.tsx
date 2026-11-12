"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/auth/user-avatar";
import { useAuthSession } from "@/components/auth/auth-session-provider";

type Profile = { carri_subject: string; avatar_url: string | null };

export function AuthenticatedProfile({ variant = "compact" }: Readonly<{ variant?: "compact" | "card" }>) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { state, markUnauthenticated } = useAuthSession();
  useEffect(() => {
    if (state !== "authenticated") {
      setProfile(null);
      return;
    }
    let active = true;
    void fetch("/api/private/profile", { credentials: "same-origin", cache: "no-store" }).then((response) => {
      if (response.status === 401) markUnauthenticated();
      return response.ok ? response.json() as Promise<{ profile: Profile }> : null;
    }).then((data) => { if (active && data?.profile) setProfile(data.profile); }).catch(() => undefined);
    return () => { active = false; };
  }, [markUnauthenticated, state]);
  if (!profile) return null;
  if (variant === "card") return <div className="flex items-center gap-4"><UserAvatar avatarUrl={profile.avatar_url} subject={profile.carri_subject} size="lg" /><div><p className="font-semibold">{profile.carri_subject}</p><p className="text-sm text-[var(--muted)]">Profil Carri Account</p></div></div>;
  return <UserAvatar avatarUrl={profile.avatar_url} subject={profile.carri_subject} size="sm" />;
}
