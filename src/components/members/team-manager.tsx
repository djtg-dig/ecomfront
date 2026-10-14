"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { Modal } from "@/components/ui/modal";
import { permissionByCode, permissionCatalog, permissionDescription, permissionLabel } from "@/lib/permissions/catalog";

type Member = { public_id: string; title: string; is_owner: boolean; status: "ACTIVE" | "SUSPENDED"; permissions: string[]; joined_at: string };
type Permission = { permission: string; label: string };
type Invitation = { public_id: string; email: string; title: string; status: string; permissions: string[]; expires_at: string };
type Paginated<T> = T[] | { results: T[] };
type TeamData = { members: Paginated<Member>; invitations: Paginated<Invitation> };

const permissionGroups = [...new Set(permissionCatalog.map((permission) => permission.group))];

async function message(response: Response) {
  try { return (await response.json() as { detail?: string }).detail ?? "Le service E-commerce est indisponible."; }
  catch { return "Le service E-commerce est indisponible."; }
}

function items<T>(data: Paginated<T>) { return Array.isArray(data) ? data : data.results ?? []; }

export function TeamManager({ businessId }: { businessId: string }) {
  const router = useRouter();
  const effectivePermissions = useBusinessPermissions(businessId);
  const canViewMembers = effectivePermissions?.includes("MEMBER_VIEW") ?? false;
  const canViewInvitations = effectivePermissions?.includes("INVITATION_VIEW") ?? false;
  const canInvite = effectivePermissions?.includes("INVITATION_CREATE") ?? false;
  const canResend = effectivePermissions?.includes("INVITATION_RESEND") ?? false;
  const canRevokeInvitation = effectivePermissions?.includes("INVITATION_REVOKE") ?? false;
  const canUpdate = effectivePermissions?.includes("MEMBER_UPDATE") ?? false;
  const canSuspend = effectivePermissions?.includes("MEMBER_SUSPEND") ?? false;
  const canReactivate = effectivePermissions?.includes("MEMBER_REACTIVATE") ?? false;
  const canRemove = effectivePermissions?.includes("MEMBER_REMOVE") ?? false;
  const canViewPermissions = effectivePermissions?.includes("MEMBER_PERMISSION_VIEW") ?? false;
  const canGrant = effectivePermissions?.includes("MEMBER_PERMISSION_GRANT") ?? false;
  const canRevokePermission = effectivePermissions?.includes("MEMBER_PERMISSION_REVOKE") ?? false;
  const [data, setData] = useState<TeamData | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  async function load() {
    setError(null);
    const response = await fetch(`/api/private/businesses/${businessId}/team`, { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await message(response));
    setData(await response.json() as TeamData);
  }

  useEffect(() => { void load(); }, [businessId]);

  async function loadCatalog() {
    if (catalog.length) return true;
    const response = await fetch(`/api/private/businesses/${businessId}/permission-catalog`, { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) { router.replace("/connexion?erreur=session_expired"); return false; }
    if (!response.ok) { setError(await message(response)); return false; }
    const supported = new Set((await response.json() as { permissions: Permission[] }).permissions.map((item) => item.permission));
    setCatalog(permissionCatalog.filter((item) => supported.has(item.code)).map((item) => ({ permission: item.code, label: item.label })));
    return true;
  }

  async function openInvitation() {
    setError(null);
    if (await loadCatalog()) setInviteOpen(true);
  }

  async function selectMember(memberId: string) {
    setPending("detail"); setError(null);
    try {
      const detail = await fetch(`/api/private/businesses/${businessId}/members/${memberId}`, { credentials: "same-origin", cache: "no-store" });
      if (detail.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!detail.ok) return setError(await message(detail));
      if (canViewPermissions || canGrant) await loadCatalog();
      setSelected((await detail.json() as { member: Member }).member);
    } catch { setError("Le chargement du membre a échoué."); }
    finally { setPending(null); }
  }

  async function mutate(path: string, init: RequestInit, name: string) {
    if (pending) return;
    setPending(name); setError(null);
    try {
      const response = await fetch(path, { ...init, credentials: "same-origin", headers: { "x-csrf-protection": "1", ...init.headers } });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await message(response));
      if (response.status === 204) setSelected(null);
      else {
        const body = await response.json() as { member?: Member };
        if (body.member) setSelected(body.member);
      }
      setConfirmingRemoval(false);
      await load();
    } catch { setError("L’action a échoué. Veuillez réessayer."); }
    finally { setPending(null); }
  }

  async function invite(form: HTMLFormElement) {
    if (pending) return;
    const formData = new FormData(form);
    setPending("invite"); setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/team`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "x-csrf-protection": "1" },
        body: JSON.stringify({ email: formData.get("email"), title: formData.get("title"), permissions: formData.getAll("permissions") }),
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await message(response));
      setInviteOpen(false);
      await load();
    } catch { setError("L’invitation n’a pas pu être envoyée."); }
    finally { setPending(null); }
  }

  async function invitationAction(invitationId: string, action: "resend" | "revoke") {
    await mutate(`/api/private/businesses/${businessId}/team/${invitationId}/${action}`, { method: "POST" }, action);
  }

  if (error && !data) return <section className="content-panel p-6" role="alert">{error}<button className="button button-primary ml-3" onClick={() => void load()} type="button">Réessayer</button></section>;
  if (!data || effectivePermissions === null) return <p>Chargement des membres…</p>;
  if (!canViewMembers && !canViewInvitations && !canInvite) return <section className="content-panel p-6" role="alert">Vous n’êtes pas autorisé à consulter ou gérer l’équipe de cette entreprise.</section>;

  const members = items(data.members);
  const invitations = items(data.invitations);
  const grantable = selected && !selected.is_owner && selected.status === "ACTIVE" ? catalog.filter((item) => effectivePermissions.includes(item.permission) && !selected.permissions.includes(item.permission)) : [];

  return <main>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">ÉQUIPE</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Membres et accès</h1></div>{canInvite ? <button className="button button-primary" disabled={Boolean(pending)} onClick={() => void openInvitation()} type="button">Inviter un membre</button> : null}</div>
    {error ? <p className="mt-4 rounded-md border border-[var(--error)]/30 p-3 text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    {canViewMembers ? <section className="content-panel mt-5 p-5"><h2 className="font-semibold">Membres</h2>{members.length ? <ul className="mt-3 divide-y">{members.map((member) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={member.public_id}><div><p className="font-medium">{member.title || "Membre"}{member.is_owner ? " · Propriétaire" : ""}</p><p className="text-sm text-[var(--muted)]">{member.status === "SUSPENDED" ? "Suspendu" : "Actif"}{canViewPermissions ? ` · ${member.permissions.length} permission(s) explicite(s)` : ""}</p></div><button className="button button-outline" disabled={pending === "detail"} onClick={() => void selectMember(member.public_id)} type="button">Consulter</button></li>)}</ul> : <p className="mt-3 text-sm">Aucun membre.</p>}</section> : null}
    {canViewInvitations ? <section className="content-panel mt-5 p-5"><h2 className="font-semibold">Invitations</h2>{invitations.length ? <ul className="mt-3 divide-y">{invitations.map((invitation) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={invitation.public_id}><div><p className="font-medium">{invitation.email}</p><p className="text-sm text-[var(--muted)]">{invitation.title || "Fonction non précisée"} · {invitation.status}</p><p className="mt-1 text-xs text-[var(--muted)]">{invitation.permissions.map(permissionLabel).join(" · ") || "Aucune permission initiale"}</p></div>{["PENDING", "EXPIRED"].includes(invitation.status) && (canResend || canRevokeInvitation) ? <div className="flex flex-wrap gap-2">{canResend ? <button className="button button-outline" disabled={Boolean(pending)} onClick={() => void invitationAction(invitation.public_id, "resend")} type="button">Renvoyer</button> : null}{canRevokeInvitation && invitation.status === "PENDING" ? <button className="button button-outline" disabled={Boolean(pending)} onClick={() => void invitationAction(invitation.public_id, "revoke")} type="button">Révoquer</button> : null}</div> : null}</li>)}</ul> : <p className="mt-3 text-sm text-[var(--muted)]">Aucune invitation.</p>}</section> : null}

    {inviteOpen ? <Modal onClose={() => setInviteOpen(false)} size="large" title="Inviter un membre"><form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); void invite(event.currentTarget); }}><label className="grid gap-1 text-sm">Adresse e-mail<input autoComplete="email" className="rounded border p-2" name="email" required type="email" /></label><label className="grid gap-1 text-sm">Fonction ou titre<input className="rounded border p-2" maxLength={120} name="title" placeholder="Ex. Caissier" /></label><div><h3 className="font-semibold">Permissions initiales</h3><p className="mt-1 text-sm text-[var(--muted)]">Ces accès seront appliqués seulement après acceptation.</p><div className="mt-3 grid gap-4 md:grid-cols-2">{permissionGroups.map((group) => { const choices = catalog.filter((item) => permissionByCode.get(item.permission)?.group === group && effectivePermissions.includes(item.permission)); return choices.length ? <fieldset className="rounded-md border p-3" key={group}><legend className="px-1 font-medium">{group}</legend><div className="grid gap-2">{choices.map((item) => <label className="flex items-start gap-2 text-sm" key={item.permission}><input className="mt-1" name="permissions" type="checkbox" value={item.permission} /><span>{item.label}<small className="block text-[var(--muted)]">{permissionDescription(item.permission)}</small></span></label>)}</div></fieldset> : null; })}</div></div>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<button aria-busy={pending === "invite"} className="button button-primary w-fit" disabled={Boolean(pending)} type="submit">{pending === "invite" ? "Envoi…" : "Envoyer l’invitation"}</button></form></Modal> : null}

    {selected ? <Modal onClose={() => { setSelected(null); setConfirmingRemoval(false); }} size="large" title={selected.title || "Membre"}><p className="text-sm text-[var(--muted)]">{selected.is_owner ? "Propriétaire : permissions implicites, non modifiables." : selected.status === "SUSPENDED" ? "Membre suspendu." : "Membre actif."}</p>
      {canUpdate ? <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const title = new FormData(event.currentTarget).get("title"); void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) }, "title"); }}><label className="grid gap-1 text-sm">Fonction<input className="rounded border p-2" defaultValue={selected.title} name="title" required /></label><button className="button button-outline" disabled={Boolean(pending)} type="submit">{pending === "title" ? "Enregistrement…" : "Modifier la fonction"}</button></form> : null}
      {!selected.is_owner ? <div className="mt-5 flex flex-wrap gap-3">{selected.status === "ACTIVE" && canSuspend ? <button className="button button-outline" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/suspend`, { method: "POST" }, "suspend")} type="button">Suspendre</button> : null}{selected.status === "SUSPENDED" && canReactivate ? <button className="button button-outline" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/reactivate`, { method: "POST" }, "reactivate")} type="button">Réactiver</button> : null}{canRemove ? <button className="button button-outline" disabled={Boolean(pending)} onClick={() => setConfirmingRemoval(true)} type="button">Retirer</button> : null}</div> : null}
      {confirmingRemoval ? <section className="mt-5 rounded-md border border-[var(--error)]/30 p-4" role="alert"><p className="text-sm">Confirmez le retrait définitif de ce membre. Ses permissions explicites seront révoquées.</p><div className="mt-3 flex gap-3"><button className="button button-primary" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}`, { method: "DELETE" }, "remove")} type="button">Confirmer le retrait</button><button className="button button-outline" disabled={Boolean(pending)} onClick={() => setConfirmingRemoval(false)} type="button">Annuler</button></div></section> : null}
      {canViewPermissions ? <section className="mt-6"><h3 className="font-semibold">Permissions explicites</h3>{selected.is_owner ? <p className="mt-2 text-sm text-[var(--muted)]">Le propriétaire possède toutes les permissions implicitement.</p> : <><ul className="mt-3 flex flex-wrap gap-2">{selected.permissions.length ? selected.permissions.map((permission) => <li className="rounded border px-2 py-1 text-sm" key={permission}>{permissionLabel(permission)}{canRevokePermission && selected.status === "ACTIVE" ? <button className="ml-2 text-[var(--error)]" disabled={Boolean(pending)} onClick={() => void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/permissions/${encodeURIComponent(permission)}`, { method: "DELETE" }, "revoke")} type="button">Retirer</button> : null}</li>) : <li className="text-sm text-[var(--muted)]">Aucune permission explicite.</li>}</ul>{canGrant && grantable.length ? <form className="mt-4 flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); const permission = new FormData(event.currentTarget).get("permission"); void mutate(`/api/private/businesses/${businessId}/members/${selected.public_id}/permissions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ permission }) }, "grant"); }}><select aria-label="Permission à ajouter" className="rounded border p-2" name="permission">{grantable.map((item) => <option key={item.permission} value={item.permission}>{item.label}</option>)}</select><button className="button button-outline" disabled={Boolean(pending)} type="submit">Ajouter</button></form> : null}</>}</section> : null}
    </Modal> : null}
  </main>;
}
