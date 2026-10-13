"use client";
import { useEffect, useState } from "react";

export function useBusinessPermissions(businessId: string) {
	const [permissions, setPermissions] = useState<{ businessId: string; values: string[] } | null>(null);

	useEffect(() => {
		let active = true;
		setPermissions(null);
		void fetch(`/api/private/businesses/${businessId}/my-permissions`, { credentials: "same-origin", cache: "no-store" })
			.then(async (response) => {
				if (active && response.ok) setPermissions({ businessId, values: (await response.json() as { permissions: string[] }).permissions });
			})
			.catch(() => undefined);
		return () => { active = false; };
	}, [businessId]);

	return permissions?.businessId === businessId ? permissions.values : null;
}
