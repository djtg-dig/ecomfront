import { BadgeCheck } from "lucide-react";

type CompanyVerificationBadgeProps = {
  isVerified: boolean | null | undefined;
};

/** Affiche uniquement l'état reçu du backend, sans traiter une donnée absente comme vérifiée. */
export function CompanyVerificationBadge({ isVerified }: CompanyVerificationBadgeProps) {
  if (isVerified === undefined || isVerified === null) return null;

  const label = isVerified ? "Entreprise vérifiée" : "Entreprise non vérifiée";
  return (
    <span
      className={isVerified ? "inline-flex shrink-0 text-[var(--brand)]" : "inline-flex shrink-0 text-[var(--muted)]"}
      role="img"
      aria-label={label}
      title={label}
    >
      <BadgeCheck aria-hidden="true" className="size-4" strokeWidth={2.25} />
    </span>
  );
}
