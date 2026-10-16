export type InvitationCompletionAction = "accept" | "decline";

export function invitationCompletionDestination(action: InvitationCompletionAction) {
  return `/espace/entreprises?invitation=${action === "accept" ? "accepted" : "declined"}`;
}

/**
 * Use a document navigation after a terminal invitation action.  This avoids
 * keeping a public invitation screen mounted while the private application
 * refreshes its authenticated data.
 */
export function navigateAfterInvitationCompletion(
  action: InvitationCompletionAction,
  navigate: (destination: string) => void,
) {
  navigate(invitationCompletionDestination(action));
}
