import { Suspense } from "react";
import { TeamManager } from "@/components/members/team-manager";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";

export default function SettingsMembersPage({ params }: { params: Promise<{ businessId: string }> }) { return <Suspense fallback={<PrivatePageFallback />}><Content params={params} /></Suspense>; }
async function Content({ params }: { params: Promise<{ businessId: string }> }) { return <TeamManager businessId={(await params).businessId} />; }
