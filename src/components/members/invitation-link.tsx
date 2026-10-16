"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { navigateAfterInvitationCompletion, type InvitationCompletionAction } from "@/lib/invitations/completion-navigation";

type Invitation = {
  business_name: string;
  business_description: string;
  business_address: string;
  business_zone: string;
  business_primary_category: string | null;
  title: string;
  status: string;
  expires_at: string;
};
type InvitationViewState = "loading" | "authentication_required" | "ready" | "reauthentication_required" | "email_verification_required" | "recipient_mismatch" | "expired" | "invalid" | "completed" | "error";
type ContextResponse = { state?: Exclude<InvitationViewState, "loading" | "expired" | "completed">; invitation?: Invitation; detail?: string };
type InvitationAction = { status?: string; business_public_id?: string };
type ActionResponse = { invitation?: InvitationAction; redirect_to?: string; code?: string; detail?: string };

const statusMessages: Record<string, string> = {
  ACCEPTED: "Cette invitation a déjà été acceptée.",
  DECLINED: "Cette invitation a déjà été refusée.",
  EXPIRED: "Cette invitation a expiré. Demandez un nouveau lien à l’entreprise.",
  REVOKED: "Cette invitation a été révoquée par l’entreprise.",
};

const messages: Record<Exclude<InvitationViewState, "loading" | "ready" | "completed">, string> = {
  authentication_required: "Veuillez d'abord vous connecter à votre compte E-commerce. Après connexion, consultez vos notifications ou vos invitations reçues dans votre espace pour retrouver cette invitation et y répondre.",
  reauthentication_required: "Une nouvelle connexion Carri Account est nécessaire pour traiter cette invitation.",
  email_verification_required: "Votre adresse e-mail Carri doit être vérifiée pour traiter cette invitation.",
  recipient_mismatch: "Cette invitation est destinée à une autre adresse e-mail. Veuillez vous connecter avec le compte correspondant.",
  expired: "Cette invitation a expiré. Demandez un nouveau lien à l’entreprise.",
  invalid: "Le lien d’invitation est invalide ou expiré.",
  error: "Le service est temporairement indisponible. Veuillez réessayer.",
};

function actionState(code: string | undefined): InvitationViewState {
  if (code === "carri_reauthentication_required") return "reauthentication_required";
  if (code === "verified_email_required") return "email_verification_required";
  if (code === "invitation_recipient_mismatch") return "recipient_mismatch";
  if (code === "invitation_expired" || code === "invitation_revoked") return "expired";
  if (code === "invitation_link_invalid" || code === "invalid_invitation_token") return "invalid";
  return "error";
}

export function InvitationLink() {
  const [state, setState] = useState<InvitationViewState>("loading");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [acceptedBusinessId, setAcceptedBusinessId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/invitation/context", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as ContextResponse;
        if (response.ok && body.state === "ready" && body.invitation) {
          setInvitation(body.invitation);
          setState("ready");
          return;
        }
        setDetail(body.detail ?? null);
        setState(body.state ?? "error");
      })
      .catch(() => setState("error"));
  }, []);

  async function act(action: InvitationCompletionAction) {
    if (pending || state !== "ready") return;
    setPending(true);
    setDetail(null);
    setAcceptedBusinessId(null);
    try {
      const response = await fetch(`/api/invitation/${action}`, { method: "POST", credentials: "same-origin", headers: { "x-csrf-protection": "1" } });
      const body = await response.json() as ActionResponse;
      if (!response.ok) {
        if (response.status === 409 && body.invitation?.status && statusMessages[body.invitation.status]) {
          setInvitation(null);
          setDetail(statusMessages[body.invitation.status]);
          setState("completed");
          return;
        }
        setDetail(body.detail ?? null);
        setState(actionState(body.code));
        return;
      }
      setInvitation(null);
      setDetail(action === "accept" ? "Invitation acceptée avec succès. L’entreprise est disponible dans votre espace." : "Invitation refusée.");
      const businessId = body.invitation?.business_public_id ?? "";
      if (action === "accept" && body.invitation?.status === "ACCEPTED" && /^[A-Za-z0-9_-]{1,64}$/.test(businessId)) {
        setAcceptedBusinessId(businessId);
      }
      setState("completed");
      // The BFF, not Django or the URL, supplies this fixed internal location.
      // Give React one paint to expose the success message, then force a full
      // document navigation so a stale App Router cache cannot keep /invitation.
      const expectedDestination = `/espace/entreprises?invitation=${action === "accept" ? "accepted" : "declined"}`;
      if (body.redirect_to !== expectedDestination) {
        setDetail("L’invitation est finalisée. Utilisez « Mes entreprises » pour continuer.");
        return;
      }
      window.setTimeout(() => {
        try {
          navigateAfterInvitationCompletion(action, (destination) => window.location.assign(destination));
        } catch {
          setDetail("L’invitation est finalisée. Utilisez « Mes entreprises » pour continuer.");
        }
      }, 150);
    } catch {
      setState("error");
    } finally {
      setPending(false);
    }
  }

  const loginAction = state === "authentication_required" || state === "reauthentication_required";
  const changeAccount = state === "recipient_mismatch";
  const displayedMessage = detail ?? (state === "completed" ? "" : messages[state as Exclude<InvitationViewState, "loading" | "ready" | "completed">]);

  const processedMessage = invitation ? statusMessages[invitation.status] : undefined;

  return <main className="page-shell grid min-h-screen place-items-center p-6"><section className="content-panel w-full max-w-md p-8"><p className="eyebrow">E-COMMERCE</p><h1 className="mt-3 text-2xl font-semibold text-[var(--brand-secondary)]">Invitation d’entreprise</h1>{state === "loading" ? <p aria-busy="true" className="mt-4 text-sm text-[var(--muted)]">Vérification de l’invitation…</p> : null}{state !== "loading" && state !== "ready" && displayedMessage ? <p className="mt-4 text-sm" role={state === "completed" ? "status" : "alert"}>{displayedMessage}</p> : null}{loginAction ? <Link className="button button-primary mt-6" href="/api/invitation/login" prefetch={false}>Se connecter avec Carri Account</Link> : null}{changeAccount ? <Link className="button button-primary mt-6" href="/api/invitation/login" prefetch={false}>Se connecter avec un autre compte</Link> : null}{state === "completed" ? <div className="mt-6 flex flex-wrap gap-3"><Link className="button button-primary" href="/espace/entreprises">Mes entreprises</Link>{acceptedBusinessId ? <Link className="button button-outline" href={`/espace/entreprises/${acceptedBusinessId}`}>Accéder à l’entreprise</Link> : null}</div> : null}{state === "ready" && invitation ? <><p className="mt-4">Vous êtes invité à rejoindre <strong>{invitation.business_name}</strong>.</p>{invitation.business_description ? <p className="mt-2 text-sm text-[var(--muted)]">{invitation.business_description}</p> : null}{invitation.business_primary_category ? <p className="mt-2 text-sm text-[var(--muted)]">Secteur : {invitation.business_primary_category}</p> : null}{invitation.business_zone || invitation.business_address ? <p className="mt-2 text-sm text-[var(--muted)]">Localisation : {[invitation.business_zone, invitation.business_address].filter(Boolean).join(" · ")}</p> : null}<p className="mt-2 text-sm text-[var(--muted)]">Fonction proposée : {invitation.title || "Non précisée"}</p><p className="mt-2 text-sm text-[var(--muted)]">Expiration : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expires_at))}</p>{processedMessage ? <><p className="mt-5 text-sm" role="status">{processedMessage}</p><Link className="button button-primary mt-6" href="/espace/entreprises">Voir mes entreprises</Link></> : <div className="mt-6 flex gap-3"><button aria-busy={pending} className="button button-primary" disabled={pending} onClick={() => void act("accept")} type="button">Accepter</button><button className="button button-outline" disabled={pending} onClick={() => void act("decline")} type="button">Refuser</button></div>}</> : null}</section></main>;
}
