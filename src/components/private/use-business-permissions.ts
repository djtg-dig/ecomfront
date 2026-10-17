"use client";

import { useBusinessPermissionsState } from "@/components/private/business-permissions-provider";

export function useBusinessPermissions(businessId: string) {
	const state = useBusinessPermissionsState();
	return state?.status === "ready" ? state.permissions : null;
}
