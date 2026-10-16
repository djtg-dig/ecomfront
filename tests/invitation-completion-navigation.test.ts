import { describe, expect, it, vi } from "vitest";

import { invitationCompletionDestination, navigateAfterInvitationCompletion } from "@/lib/invitations/completion-navigation";

describe("navigation après finalisation d’invitation", () => {
  it.each([
    ["accept", "/espace/entreprises?invitation=accepted"],
    ["decline", "/espace/entreprises?invitation=declined"],
  ] as const)("déclenche une navigation document vers la destination interne après %s", (action, destination) => {
    const navigate = vi.fn();

    navigateAfterInvitationCompletion(action, navigate);

    expect(invitationCompletionDestination(action)).toBe(destination);
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(destination);
  });
});
