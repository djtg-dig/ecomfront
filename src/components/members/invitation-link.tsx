"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Invitation = { business_name: string; title: string };
type InvitationViewState = "loading" | "authentication_required" | "ready" | "reauthentication_required" | "email_verification_required" | "recipient_mismatch" | "expired" | "invalid" | "completed" | "error";
type ContextResponse = { state?: Exclude<InvitationViewState, "loading" | "expired" | "completed">; invitation?: Invitation; detail?: string };
type ActionResponse = { code?: string; detail?: string };

const messages: Record<Exclude<InvitationViewState, "loading" | "ready" | "completed">, string> = {
  authentication_required: "Veuillez vous connecter avec votre compte Carri Account pour consulter cette invitation et y répondre.",
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

  async function act(action: "accept" | "decline") {
    if (pending || state !== "ready") return;
    setPending(true);
    setDetail(null);
    try {
      const response = await fetch(`/api/invitation/${action}`, { method: "POST", credentials: "same-origin", headers: { "x-csrf-protection": "1" } });
      const body = await response.json() as ActionResponse;
      if (!response.ok) {
        setDetail(body.detail ?? null);
        setState(actionState(body.code));
        return;
      }
      setInvitation(null);
      setDetail(action === "accept" ? "Invitation acceptée. L’entreprise est disponible dans votre espace." : "Invitation refusée.");
      setState("completed");
    } catch {
      setState("error");
    } finally {
      setPending(false);
    }
  }

  const loginAction = state === "authentication_required" || state === "reauthentication_required";
  const changeAccount = state === "recipient_mismatch";
  const displayedMessage = detail ?? (state === "completed" ? "" : messages[state as Exclude<InvitationViewState, "loading" | "ready" | "completed">]);

  return <main className="page-shell grid min-h-screen place-items-center p-6"><section className="content-panel w-full max-w-md p-8"><p className="eyebrow">E-COMMERCE</p><h1 className="mt-3 text-2xl font-semibold text-[var(--brand-secondary)]">Invitation d’entreprise</h1>{state === "loading" ? <p aria-busy="true" className="mt-4 text-sm text-[var(--muted)]">Vérification de l’invitation…</p> : null}{state !== "loading" && state !== "ready" && displayedMessage ? <p className="mt-4 text-sm" role={state === "completed" ? "status" : "alert"}>{displayedMessage}</p> : null}{loginAction ? <Link className="button button-primary mt-6" href="/api/invitation/login" prefetch={false}>Se connecter avec Carri Account</Link> : null}{changeAccount ? <Link className="button button-primary mt-6" href="/api/invitation/login" prefetch={false}>Se connecter avec un autre compte</Link> : null}{state === "ready" && invitation ? <><p className="mt-4">Vous êtes invité à rejoindre <strong>{invitation.business_name}</strong>.</p><p className="mt-2 text-sm text-[var(--muted)]">Fonction proposée : {invitation.title || "Non précisée"}</p><div className="mt-6 flex gap-3"><button aria-busy={pending} className="button button-primary" disabled={pending} onClick={() => void act("accept")} type="button">Accepter</button><button className="button button-outline" disabled={pending} onClick={() => void act("decline")} type="button">Refuser</button></div></> : null}</section></main>;
}
