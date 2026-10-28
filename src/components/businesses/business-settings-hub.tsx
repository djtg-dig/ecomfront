"use client";

import Link from "next/link";
import { BadgeDollarSign, ChevronRight, ImageIcon, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

const memberPermissions = ["MEMBER_VIEW", "MEMBER_PERMISSION_VIEW", "INVITATION_VIEW", "INVITATION_CREATE", "MEMBER_UPDATE"];

type SettingsLink = { href: string; title: string; description: string; icon: typeof UsersRound };

export function BusinessSettingsHub({ businessId }: { businessId: string }) {
  const permissions = useBusinessPermissions(businessId);
  const canManageMembers = permissions?.some((permission) => memberPermissions.includes(permission)) ?? false;
  const canManageBusiness = permissions?.includes("BUSINESS_UPDATE") ?? false;
  const links: SettingsLink[] = [
    ...(canManageMembers ? [{ href: `/espace/entreprises/${businessId}/parametres/membres`, title: "Membres et accès", description: "Gérez les collaborateurs, invitations, rôles et permissions de votre entreprise.", icon: UsersRound }] : []),
    ...(canManageBusiness ? [
      { href: `/espace/entreprises/${businessId}/parametres/devises`, title: "Devises et paiements", description: "Configurez les devises acceptées et les taux de conversion manuels.", icon: BadgeDollarSign },
      { href: `/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`, title: "Fonctionnement commercial", description: "Définissez le point de vente, les canaux et les modalités de remise.", icon: Settings2 },
      { href: `/espace/entreprises/${businessId}/parametres/identite`, title: "Identité visuelle", description: "Gérez le logo et la bannière de l’entreprise.", icon: ImageIcon },
    ] : []),
  ];

  return <main className="min-w-0"><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}`}>← Entreprise</Link><header className="mt-5"><p className="eyebrow">ADMINISTRATION</p><div className="mt-1 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#EFF6FF] text-[#2563EB]"><ShieldCheck aria-hidden="true" size={22} /></span><h1 className="text-3xl font-semibold text-[#0F172A]">Paramètres de l’entreprise</h1></div><p className="mt-3 max-w-2xl text-sm text-[#64748B]">Configurez les éléments autorisés pour l’entreprise active.</p></header>{permissions === null ? <section aria-label="Chargement des paramètres" className="mt-6 grid gap-4 sm:grid-cols-2"><div className="skeleton h-40" /><div className="skeleton h-40" /></section> : links.length ? <section aria-labelledby="settings-sections" className="mt-7"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-semibold text-[#0F172A]" id="settings-sections">Sections disponibles</h2><p className="mt-1 text-sm text-[#64748B]">Vos accès reflètent les permissions attribuées à votre rôle.</p></div><span className="status-badge status-info">{links.length} section{links.length > 1 ? "s" : ""}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{links.map((link) => { const Icon = link.icon; return <Link className="app-card app-card-interactive group flex min-h-44 flex-col p-5" href={link.href} key={link.href}><span className="grid size-11 place-items-center rounded-xl bg-[#EFF6FF] text-[#2563EB]"><Icon aria-hidden="true" size={21} /></span><h3 className="mt-4 flex items-center justify-between gap-3 font-semibold text-[#0F172A] group-hover:text-[#2563EB]">{link.title}<ChevronRight aria-hidden="true" className="shrink-0 text-[#64748B]" size={18} /></h3><p className="mt-2 text-sm leading-6 text-[#64748B]">{link.description}</p></Link>; })}</div></section> : <section className="empty-state mt-7"><ShieldCheck aria-hidden="true" size={25} /><p className="mt-3 text-sm">Vous ne disposez d’aucun accès aux paramètres de cette entreprise.</p></section>}</main>;
}
