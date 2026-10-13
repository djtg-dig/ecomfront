"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Invitation = { public_id: string; business_public_id: string; business_name: string; title: string; permissions: string[]; status: string; expires_at: string };

async function message(response: Response) {
  try { return (await response.json() as { detail?: string }).detail ?? "Le service E-commerce est indisponible."; }
  catch { return "Le service E-commerce est indisponible."; }
}

export function ReceivedInvitations() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setError(null);
    const response = await fetch("/api/private/invitations", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await message(response));
    setInvitations((await response.json() as { invitations: Invitation[] }).invitations);
  }

  useEffect(() => { void load(); }, []);

  async function act(invitationId: string, action: "accept" | "decline") {
    if (pending) return;
    setPending(`${invitationId}:${action}`); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/private/invitations/${invitationId}/${action}`, { method: "POST", credentials: "same-origin", headers: { "x-csrf-protection": "1" } });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await message(response));
      setNotice(action === "accept" ? "Invitation acceptée. L’entreprise est maintenant disponible dans Mes entreprises." : "Invitation refusée.");
      await load();
      router.refresh();
    } catch { setError("L’invitation n’a pas pu être traitée."); }
    finally { setPending(null); }
  }

  return <main><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">MON COMPTE</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Invitations reçues</h1></div><Link className="button button-outline" href="/espace/entreprises">Mes entreprises</Link></div>{error ? <p className="mt-4 rounded-md border border-[var(--error)]/30 p-3 text-sm text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="mt-4 rounded-md border p-3 text-sm" role="status">{notice}</p> : null}<section className="content-panel mt-6 p-5">{invitations === null ? <p>Chargement des invitations…</p> : invitations.length ? <ul className="divide-y">{invitations.map((invitation) => <li className="py-4" key={invitation.public_id}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">{invitation.business_name}</h2><p className="mt-1 text-sm text-[var(--muted)]">Fonction proposée : {invitation.title || "Non précisée"}</p><p className="mt-1 text-sm text-[var(--muted)]">Expiration : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expires_at))}</p><div className="mt-3"><h3 className="text-sm font-medium">Permissions proposées</h3>{invitation.permissions.length ? <ul className="mt-2 flex flex-wrap gap-2">{invitation.permissions.map((permission) => <li className="rounded border px-2 py-1 text-xs" key={permission}>{permission}</li>)}</ul> : <p className="mt-1 text-sm text-[var(--muted)]">Aucune permission initiale.</p>}</div></div><div className="flex gap-2"><button aria-busy={pending === `${invitation.public_id}:accept`} className="button button-primary" disabled={Boolean(pending)} onClick={() => void act(invitation.public_id, "accept")} type="button">Accepter</button><button aria-busy={pending === `${invitation.public_id}:decline`} className="button button-outline" disabled={Boolean(pending)} onClick={() => void act(invitation.public_id, "decline")} type="button">Refuser</button></div></div></li>)}</ul> : <p className="text-sm text-[var(--muted)]">Aucune invitation en attente.</p>}</section></main>;
}
