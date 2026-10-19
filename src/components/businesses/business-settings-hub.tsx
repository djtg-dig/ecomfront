"use client";

import Link from "next/link";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";

const memberPermissions = ["MEMBER_VIEW", "MEMBER_PERMISSION_VIEW", "INVITATION_VIEW", "INVITATION_CREATE", "MEMBER_UPDATE"];

export function BusinessSettingsHub({ businessId }: { businessId: string }) {
  const permissions = useBusinessPermissions(businessId);
  const canManageMembers = permissions?.some((permission) => memberPermissions.includes(permission)) ?? false;
  const canManageMoney = permissions?.includes("BUSINESS_UPDATE") ?? false;

  return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}`}>← Entreprise</Link><p className="eyebrow mt-4">ESPACE ENTREPRISE</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Paramètres entreprise</h1><p className="mt-3 text-sm text-[var(--muted)]">Choisissez une rubrique autorisée pour votre rôle.</p>{permissions === null ? <p className="mt-6 text-sm text-[var(--muted)]">Chargement de vos accès…</p> : <section className="mt-6 grid gap-4 sm:grid-cols-2">{canManageMembers ? <Link className="content-panel block p-5 transition hover:border-[var(--brand-secondary)]" href={`/espace/entreprises/${businessId}/parametres/membres`}><h2 className="font-semibold">Membres et accès</h2><p className="mt-2 text-sm text-[var(--muted)]">Gérez les collaborateurs, invitations, rôles et permissions de votre entreprise.</p></Link> : null}{canManageMoney ? <Link className="content-panel block p-5 transition hover:border-[var(--brand-secondary)]" href={`/espace/entreprises/${businessId}/parametres/devises`}><h2 className="font-semibold">Devises et paiements</h2><p className="mt-2 text-sm text-[var(--muted)]">Configurez la devise principale, les devises acceptées et les taux de change.</p></Link> : null}{!canManageMembers && !canManageMoney ? <p className="content-panel p-5 text-sm">Vous n’êtes pas autorisé à gérer les paramètres de cette entreprise.</p> : null}</section>}</main>;
}
