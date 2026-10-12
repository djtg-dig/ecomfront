"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Member = { public_id: string; title: string; is_owner: boolean; status: "ACTIVE" | "SUSPENDED"; permissions: string[]; joined_at: string };
type Permission = { permission: string; label: string };
type TeamData = { members: Member[] | { results: Member[] }; invitations: unknown };

async function message(response: Response) {
  try { return (await response.json() as { detail?: string }).detail ?? "Le service E-commerce est indisponible."; }
  catch { return "Le service E-commerce est indisponible."; }
}

function memberList(data: TeamData | null) {
  return !data ? [] : Array.isArray(data.members) ? data.members : data.members.results ?? [];
}

export function TeamManager({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [data, setData] = useState<TeamData | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  async function load() {
    setError(null);
    const response = await fetch(`/api/private/businesses/${businessId}/team`, { credentials: "same-origin" });
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await message(response));
    setData(await response.json() as TeamData);
  }

  useEffect(() => { void load(); }, [businessId]);

  async function selectMember(memberId: string) {
    setPending("detail"); setError(null);
    try {
      const [detail, permissions] = await Promise.all([
        fetch(`/api/private/businesses/${businessId}/members/${memberId}`, { credentials: "same-origin" }),
        fetch(`/api/private/businesses/${businessId}/permission-catalog`, { credentials: "same-origin" }),
      ]);
      if (detail.status === 401 || permissions.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!detail.ok) return setError(await message(detail));
      setSelected((await detail.json() as { member: Member }).member);
      if (permissions.ok) setCatalog((await permissions.json() as { permissions: Permission[] }).permissions);
    } catch { setError("Le chargement du membre a échoué."); }
    finally { setPending(null); }
  }

  async function mutate(path: string, init: RequestInit, name: string) {
    setPending(name); setError(null);
    try {
      const response = await fetch(path, { ...init, credentials: "same-origin", headers: { "x-csrf-protection": "1", ...init.headers } });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await message(response));
      if (response.status === 204) setSelected(null);
      else { const body = await response.json() as { member?: Member }; if (body.member) setSelected(body.member); }
      setConfirmingRemoval(false); await load();
      if (response.status !== 204 && selected) await selectMember(selected.public_id);
    } catch { setError("L’action a échoué. Veuillez réessayer."); }
    finally { setPending(null); }
  }

  if (error && !data) return <section className="content-panel p-6" role="alert">{error}<button className="button button-primary ml-3" onClick={() => void load()} type="button">Réessayer</button></section>;
  if (!data) return <p>Chargement des membres…</p>;

  const members = memberList(data);
  const grantable = selected && !selected.is_owner && selected.status === "ACTIVE" ? catalog.filter((item) => !selected.permissions.includes(item.permission)) : [];

  return <main>
    <p className="eyebrow">ÉQUIPE</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Membres et invitations</h1>
    {error ? <p className="mt-4 rounded-md border border-[var(--error)]/30 p-3 text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    <section className="content-panel mt-5 p-5"><h2 className="font-semibold">Membres</h2>{members.length ? <ul className="mt-3 divide-y">{members.map((member) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={member.public_id}><div><p className="font-medium">{member.title}{member.is_owner ? " · Propriétaire" : ""}</p><p className="text-sm text-[var(--muted)]">{member.status === "SUSPENDED" ? "Suspendu" : "Actif"} · {member.permissions.length} permission(s) explicite(s)</p></div><button className="button button-outline" disabled={pending === "detail"} onClick={() => void selectMember(member.public_id)} type="button">Gérer</button></li>)}</ul> : <p className="mt-3 text-sm">Aucun membre.</p>}</section>
    {selected ? <section className="content-panel mt-5 p-5" aria-label="Détail du membre"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{selected.title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{selected.is_owner ? "Propriétaire : permissions implicites, non modifiables." : selected.status === "SUSPENDED" ? "Membre suspendu." : "Membre actif."}</p></div><button className="nav-link text-sm" onClick={() => setSelected(null)} type="button">Fermer</button></div>
      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const title = new FormData(event.currentTarget).get("title"); void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) }, "title"); }}><label className="grid gap-1 text-sm">Fonction<input className="rounded border p-2" defaultValue={selected.title} name="title" required /></label><button className="button button-outline" disabled={Boolean(pending)} type="submit">{pending === "title" ? "Enregistrement…" : "Modifier la fonction"}</button></form><p className="mt-3 text-sm text-[var(--muted)]">Le rôle ne peut pas être modifié : le contrat Django n’autorise que la fonction via PATCH.</p>
      {!selected.is_owner ? <div className="mt-5 flex flex-wrap gap-3">{selected.status === "ACTIVE" ? <button className="button button-outline" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/suspend`, { method: "POST" }, "suspend")} type="button">{pending === "suspend" ? "Suspension…" : "Suspendre"}</button> : <button className="button button-outline" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/reactivate`, { method: "POST" }, "reactivate")} type="button">{pending === "reactivate" ? "Réactivation…" : "Réactiver"}</button>}<button className="button button-outline" disabled={Boolean(pending)} onClick={() => setConfirmingRemoval(true)} type="button">Retirer</button></div> : null}
      {confirmingRemoval ? <section className="mt-5 rounded-md border border-[var(--error)]/30 p-4" role="alert"><p className="text-sm">Confirmez le retrait définitif de ce membre. Ses permissions explicites seront révoquées.</p><div className="mt-3 flex gap-3"><button className="button button-primary" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}`, { method: "DELETE" }, "remove")} type="button">{pending === "remove" ? "Retrait…" : "Confirmer le retrait"}</button><button className="button button-outline" disabled={Boolean(pending)} onClick={() => setConfirmingRemoval(false)} type="button">Annuler</button></div></section> : null}
      <section className="mt-6"><h3 className="font-semibold">Permissions explicites</h3>{selected.is_owner ? <p className="mt-2 text-sm text-[var(--muted)]">Le propriétaire possède toutes les permissions implicitement.</p> : <><ul className="mt-3 flex flex-wrap gap-2">{selected.permissions.length ? selected.permissions.map((permission) => <li className="rounded border px-2 py-1 text-sm" key={permission}>{permission}{selected.status === "ACTIVE" ? <button className="ml-2 text-[var(--error)]" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/permissions/${encodeURIComponent(permission)}`, { method: "DELETE" }, "revoke")} type="button">Retirer</button> : null}</li>) : <li className="text-sm text-[var(--muted)]">Aucune permission explicite.</li>}</ul>{grantable.length ? <form className="mt-4 flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); const permission = new FormData(event.currentTarget).get("permission"); void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/permissions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ permission }) }, "grant"); }}><select aria-label="Permission à ajouter" className="rounded border p-2" name="permission">{grantable.map((item) => <option key={item.permission} value={item.permission}>{item.label}</option>)}</select><button className="button button-outline" disabled={Boolean(pending)} type="submit">{pending === "grant" ? "Ajout…" : "Ajouter"}</button></form> : null}</>}</section>
    </section> : null}
  </main>;
}
