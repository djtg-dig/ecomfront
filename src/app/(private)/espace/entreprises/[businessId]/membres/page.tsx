import { Suspense } from "react";

import { TeamManager } from "@/components/members/team-manager";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

type Props = { params: Promise<{ businessId: string }> };
export default function MembersPage({ params }: Props) { return <Suspense fallback={<PrivatePageFallback />}><MembersContent params={params} /></Suspense>; }
async function MembersContent({ params }: Props) { return <TeamManager businessId={(await params).businessId} />; }
